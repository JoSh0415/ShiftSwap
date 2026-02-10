import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, forbidden } from '@/lib/utils'

// GET /api/changelog — Get shift swap logs for current org
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (session.role !== 'MANAGER') return forbidden()

    const logs = await prisma.shiftSwapLog.findMany({
      where: {
        shift: { organisationId: session.organisationId },
      },
      include: {
        actor: { select: { name: true, role: true } },
        shift: {
          select: {
            title: true,
            date: true,
            startTime: true,
            endTime: true,
            originalOwner: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return success({ logs })
  } catch (e: unknown) {
    console.error('Get changelog error:', e)
    return error('Internal server error', 500)
  }
}
