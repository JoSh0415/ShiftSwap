import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, forbidden } from '@/lib/utils'

// GET /api/org — Get current organisation details
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const org = await prisma.organisation.findUnique({
      where: { id: session.organisationId },
      select: {
        id: true,
        name: true,
        joinCode: true,
        createdAt: true,
        _count: { select: { members: true, shifts: true } },
      },
    })

    if (!org) return error('Organisation not found', 404)

    // Only managers can see the join code
    if (session.role !== 'MANAGER') {
      return success({
        org: { id: org.id, name: org.name, memberCount: org._count.members, shiftCount: org._count.shifts },
      })
    }

    return success({
      org: {
        id: org.id,
        name: org.name,
        joinCode: org.joinCode,
        memberCount: org._count.members,
        shiftCount: org._count.shifts,
        createdAt: org.createdAt,
      },
    })
  } catch (e: unknown) {
    console.error('Get org error:', e)
    return error('Internal server error', 500)
  }
}

// Validate join code (public endpoint)
export async function POST() {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (session.role !== 'MANAGER') return forbidden()

    // Regenerate join code
    const { generateJoinCode } = await import('@/lib/utils')
    let joinCode = generateJoinCode()
    let attempts = 0
    while (attempts < 10) {
      const existing = await prisma.organisation.findUnique({ where: { joinCode } })
      if (!existing) break
      joinCode = generateJoinCode()
      attempts++
    }

    const org = await prisma.organisation.update({
      where: { id: session.organisationId },
      data: { joinCode },
    })

    return success({ joinCode: org.joinCode })
  } catch (e: unknown) {
    console.error('Regenerate code error:', e)
    return error('Internal server error', 500)
  }
}
