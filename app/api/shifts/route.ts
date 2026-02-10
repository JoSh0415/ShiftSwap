import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, forbidden, formatDate, formatTime } from '@/lib/utils'
import { sendNotificationToRole, sendNotificationToMember } from '@/lib/notifications'

// GET /api/shifts — Get shifts for current org
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      organisationId: session.organisationId,
    }
    if (status) {
      where.status = status
    }
    // Staff only see POSTED shifts (available to claim) + their own shifts
    if (session.role === 'STAFF') {
      where.OR = [
        { status: 'POSTED' },
        { originalOwnerId: session.memberId },
        { claimedById: session.memberId },
      ]
      delete where.status
    }

    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        include: {
          originalOwner: { select: { id: true, name: true, staffRole: true } },
          claimedBy: { select: { id: true, name: true, staffRole: true } },
          postedBy: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
        skip,
        take: limit,
      }),
      prisma.shift.count({ where }),
    ])

    return success({ shifts, total, page, limit })
  } catch (e: unknown) {
    console.error('Get shifts error:', e)
    return error('Internal server error', 500)
  }
}

// POST /api/shifts — Post a new shift for swapping
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const body = await req.json()
    const { title, date, startTime, endTime, reason, originalOwnerId } = body

    if (!title || !date || !startTime || !endTime || !originalOwnerId) {
      return error('All fields are required')
    }

    // Managers can post on behalf of staff, staff can post their own
    if (session.role === 'STAFF' && originalOwnerId !== session.memberId) {
      return forbidden('You can only post your own shifts')
    }

    // Verify original owner exists in the org
    const owner = await prisma.member.findFirst({
      where: { id: originalOwnerId, organisationId: session.organisationId },
    })
    if (!owner) return error('Staff member not found')

    const shift = await prisma.shift.create({
      data: {
        title,
        date: new Date(date),
        startTime,
        endTime,
        reason,
        organisationId: session.organisationId,
        postedById: session.memberId,
        originalOwnerId,
        status: 'POSTED',
      },
      include: {
        originalOwner: { select: { id: true, name: true, staffRole: true } },
        postedBy: { select: { id: true, name: true } },
      },
    })

    // Log the action
    await prisma.shiftSwapLog.create({
      data: {
        shiftId: shift.id,
        actorId: session.memberId,
        action: 'POSTED',
        details: JSON.stringify({ title, date, startTime, endTime, reason, ownerName: owner.name }),
      },
    })

    // Notify all staff (except the original owner) that a shift is available
    const shiftDate = formatDate(new Date(date))
    const shiftTime = formatTime(startTime, endTime)
    await sendNotificationToRole(session.organisationId, 'STAFF', {
      title: '🔔 Shift Available!',
      body: `${owner.name}'s ${title} on ${shiftDate} (${shiftTime}) is up for grabs!`,
      tag: `shift-${shift.id}`,
    }, originalOwnerId)

    return success({ shift }, 201)
  } catch (e: unknown) {
    console.error('Post shift error:', e)
    return error('Internal server error', 500)
  }
}

// PATCH /api/shifts — Claim or approve/decline a shift
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const body = await req.json()
    const { shiftId, action, version } = body

    if (!shiftId || !action) {
      return error('shiftId and action are required')
    }

    if (action === 'CLAIM') {
      return await claimShift(shiftId, version, session)
    } else if (action === 'APPROVE') {
      return await approveShift(shiftId, version, session)
    } else if (action === 'DECLINE') {
      return await declineShift(shiftId, version, session)
    } else if (action === 'CANCEL') {
      return await cancelShift(shiftId, version, session)
    }

    return error('Invalid action')
  } catch (e: unknown) {
    console.error('Patch shift error:', e)
    return error('Internal server error', 500)
  }
}

// === CLAIM with optimistic concurrency (race condition protection) ===
async function claimShift(
  shiftId: string,
  expectedVersion: number,
  session: { memberId: string; organisationId: string; role: string; name: string }
) {
  // Use a transaction with optimistic concurrency control
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock the row by selecting with the expected version
      const shift = await tx.shift.findFirst({
        where: {
          id: shiftId,
          organisationId: session.organisationId,
          status: 'POSTED',
          version: expectedVersion,
        },
      })

      if (!shift) {
        // Check if shift exists at all
        const existing = await tx.shift.findFirst({
          where: { id: shiftId, organisationId: session.organisationId },
        })
        if (!existing) {
          throw new Error('SHIFT_NOT_FOUND')
        }
        if (existing.status !== 'POSTED') {
          throw new Error('SHIFT_ALREADY_CLAIMED')
        }
        throw new Error('VERSION_CONFLICT')
      }

      // Can't claim your own shift
      if (shift.originalOwnerId === session.memberId) {
        throw new Error('CANNOT_CLAIM_OWN_SHIFT')
      }

      // Atomically update with version check
      const updated = await tx.shift.updateMany({
        where: {
          id: shiftId,
          version: expectedVersion,
          status: 'POSTED',
        },
        data: {
          status: 'CLAIMED',
          claimedById: session.memberId,
          claimedAt: new Date(),
          version: { increment: 1 },
        },
      })

      if (updated.count === 0) {
        throw new Error('VERSION_CONFLICT')
      }

      // Log the claim
      await tx.shiftSwapLog.create({
        data: {
          shiftId,
          actorId: session.memberId,
          action: 'CLAIMED',
          details: JSON.stringify({ claimedBy: session.name }),
        },
      })

      return tx.shift.findUnique({
        where: { id: shiftId },
        include: {
          originalOwner: { select: { id: true, name: true, staffRole: true } },
          claimedBy: { select: { id: true, name: true, staffRole: true } },
          postedBy: { select: { id: true, name: true } },
        },
      })
    })

    // Notify managers about the claim
    const shiftDate = formatDate(result!.date)
    const shiftTime = formatTime(result!.startTime, result!.endTime)
    await sendNotificationToRole(session.organisationId, 'MANAGER', {
      title: '📋 Shift Claimed!',
      body: `${session.name} wants to cover ${result!.originalOwner.name}'s ${result!.title} on ${shiftDate} (${shiftTime}). Approve?`,
      tag: `claim-${shiftId}`,
    })

    return success({ shift: result })
  } catch (e: unknown) {
    const message = (e as Error).message
    if (message === 'SHIFT_NOT_FOUND') return error('Shift not found', 404)
    if (message === 'SHIFT_ALREADY_CLAIMED') return error('This shift has already been claimed by someone else', 409)
    if (message === 'VERSION_CONFLICT') return error('Someone else just claimed this shift. Please refresh.', 409)
    if (message === 'CANNOT_CLAIM_OWN_SHIFT') return error("You can't claim your own shift", 400)
    throw e
  }
}

async function approveShift(
  shiftId: string,
  expectedVersion: number,
  session: { memberId: string; organisationId: string; role: string; name: string }
) {
  if (session.role !== 'MANAGER') {
    return forbidden('Only managers can approve shifts')
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.shift.updateMany({
      where: {
        id: shiftId,
        organisationId: session.organisationId,
        status: 'CLAIMED',
        version: expectedVersion,
      },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        version: { increment: 1 },
      },
    })

    if (updated.count === 0) {
      throw new Error('CANNOT_APPROVE')
    }

    await tx.shiftSwapLog.create({
      data: {
        shiftId,
        actorId: session.memberId,
        action: 'APPROVED',
        details: JSON.stringify({ approvedBy: session.name }),
      },
    })

    return tx.shift.findUnique({
      where: { id: shiftId },
      include: {
        originalOwner: { select: { id: true, name: true, staffRole: true } },
        claimedBy: { select: { id: true, name: true, staffRole: true } },
      },
    })
  })

  // Notify both parties
  const shiftDate = formatDate(result!.date)
  const shiftTime = formatTime(result!.startTime, result!.endTime)

  await Promise.all([
    sendNotificationToMember(result!.claimedBy!.id, {
      title: '✅ Shift Approved!',
      body: `Your claim for ${result!.title} on ${shiftDate} (${shiftTime}) has been approved!`,
      tag: `approved-${shiftId}`,
    }),
    sendNotificationToMember(result!.originalOwner.id, {
      title: '✅ Shift Swap Confirmed',
      body: `${result!.claimedBy!.name} will cover your ${result!.title} on ${shiftDate} (${shiftTime}).`,
      tag: `approved-${shiftId}`,
    }),
  ])

  return success({ shift: result })
}

async function declineShift(
  shiftId: string,
  expectedVersion: number,
  session: { memberId: string; organisationId: string; role: string; name: string }
) {
  if (session.role !== 'MANAGER') {
    return forbidden('Only managers can decline shifts')
  }

  const result = await prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findFirst({
      where: {
        id: shiftId,
        organisationId: session.organisationId,
        status: 'CLAIMED',
        version: expectedVersion,
      },
    })

    if (!shift) throw new Error('CANNOT_DECLINE')

    // Decline resets the shift back to POSTED so others can claim
    await tx.shift.update({
      where: { id: shiftId },
      data: {
        status: 'POSTED',
        claimedById: null,
        claimedAt: null,
        declinedAt: new Date(),
        version: { increment: 1 },
      },
    })

    await tx.shiftSwapLog.create({
      data: {
        shiftId,
        actorId: session.memberId,
        action: 'DECLINED',
        details: JSON.stringify({ declinedBy: session.name, previousClaimant: shift.claimedById }),
      },
    })

    return tx.shift.findUnique({
      where: { id: shiftId },
      include: {
        originalOwner: { select: { id: true, name: true, staffRole: true } },
        claimedBy: { select: { id: true, name: true, staffRole: true } },
      },
    })
  })

  // Notify the declined claimant
  if (result) {
    const shiftDate = formatDate(result.date)
    const shiftTime = formatTime(result.startTime, result.endTime)

    // Re-notify staff that shift is available again
    await sendNotificationToRole(session.organisationId, 'STAFF', {
      title: '🔔 Shift Available Again!',
      body: `${result.title} on ${shiftDate} (${shiftTime}) is available for claiming again.`,
      tag: `shift-${shiftId}`,
    }, result.originalOwner.id)
  }

  return success({ shift: result })
}

async function cancelShift(
  shiftId: string,
  expectedVersion: number,
  session: { memberId: string; organisationId: string; role: string; name: string }
) {
  const result = await prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findFirst({
      where: {
        id: shiftId,
        organisationId: session.organisationId,
        version: expectedVersion,
        status: { in: ['POSTED', 'CLAIMED'] },
      },
    })

    if (!shift) throw new Error('CANNOT_CANCEL')

    // Only manager or the original poster can cancel
    if (session.role !== 'MANAGER' && shift.originalOwnerId !== session.memberId) {
      throw new Error('FORBIDDEN')
    }

    await tx.shift.update({
      where: { id: shiftId },
      data: {
        status: 'CANCELLED',
        version: { increment: 1 },
      },
    })

    await tx.shiftSwapLog.create({
      data: {
        shiftId,
        actorId: session.memberId,
        action: 'CANCELLED',
        details: JSON.stringify({ cancelledBy: session.name }),
      },
    })

    return tx.shift.findUnique({
      where: { id: shiftId },
      include: {
        originalOwner: { select: { id: true, name: true, staffRole: true } },
        claimedBy: { select: { id: true, name: true, staffRole: true } },
      },
    })
  })

  return success({ shift: result })
}
