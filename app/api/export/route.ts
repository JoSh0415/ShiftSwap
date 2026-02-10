import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, forbidden } from '@/lib/utils'

// GET /api/export — Export shift data as CSV or JSON
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (session.role !== 'MANAGER') return forbidden()

    const url = new URL(req.url)
    const format = url.searchParams.get('format') || 'csv'
    const status = url.searchParams.get('status')
    const fromDate = url.searchParams.get('from')
    const toDate = url.searchParams.get('to')

    const where: Record<string, unknown> = {
      organisationId: session.organisationId,
    }
    if (status) where.status = status
    if (fromDate || toDate) {
      where.date = {}
      if (fromDate) (where.date as Record<string, unknown>).gte = new Date(fromDate)
      if (toDate) (where.date as Record<string, unknown>).lte = new Date(toDate)
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        originalOwner: { select: { name: true, staffRole: true, email: true } },
        claimedBy: { select: { name: true, staffRole: true, email: true } },
        postedBy: { select: { name: true } },
        swapLogs: {
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: { name: true } } },
        },
      },
      orderBy: { date: 'asc' },
    })

    if (format === 'json') {
      const exportData = shifts.map((s) => ({
        shiftTitle: s.title,
        date: s.date.toISOString().split('T')[0],
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        originalStaff: s.originalOwner.name,
        originalStaffRole: s.originalOwner.staffRole,
        originalStaffEmail: s.originalOwner.email,
        coveredBy: s.claimedBy?.name || '',
        coveredByRole: s.claimedBy?.staffRole || '',
        coveredByEmail: s.claimedBy?.email || '',
        postedBy: s.postedBy.name,
        reason: s.reason || '',
        claimedAt: s.claimedAt?.toISOString() || '',
        approvedAt: s.approvedAt?.toISOString() || '',
        createdAt: s.createdAt.toISOString(),
        history: s.swapLogs.map((l) => ({
          action: l.action,
          by: l.actor.name,
          at: l.createdAt.toISOString(),
          details: l.details,
        })),
      }))

      return new Response(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="shiftswap-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      })
    }

    // CSV format
    const headers = [
      'Date', 'Start Time', 'End Time', 'Shift Title', 'Status',
      'Original Staff', 'Original Role', 'Original Email',
      'Covered By', 'Covered By Role', 'Covered By Email',
      'Reason', 'Posted By', 'Claimed At', 'Approved At', 'Created At',
    ]

    const rows = shifts.map((s) => [
      s.date.toISOString().split('T')[0],
      s.startTime,
      s.endTime,
      `"${s.title}"`,
      s.status,
      `"${s.originalOwner.name}"`,
      `"${s.originalOwner.staffRole || ''}"`,
      s.originalOwner.email,
      `"${s.claimedBy?.name || ''}"`,
      `"${s.claimedBy?.staffRole || ''}"`,
      s.claimedBy?.email || '',
      `"${s.reason || ''}"`,
      `"${s.postedBy.name}"`,
      s.claimedAt?.toISOString() || '',
      s.approvedAt?.toISOString() || '',
      s.createdAt.toISOString(),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="shiftswap-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (e: unknown) {
    console.error('Export error:', e)
    return error('Internal server error', 500)
  }
}
