import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/utils'

// GET /api/roles/public?joinCode=XXXXXX — Get available roles for a join code (no auth required)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const joinCode = url.searchParams.get('joinCode')

    if (!joinCode) return error('joinCode is required')

    const org = await prisma.organisation.findUnique({
      where: { joinCode: joinCode.toUpperCase() },
      select: { id: true },
    })

    if (!org) return error('Invalid join code', 404)

    const roles = await prisma.orgRole.findMany({
      where: { organisationId: org.id },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })

    return success({ roles })
  } catch (e: unknown) {
    console.error('Get public roles error:', e)
    return error('Internal server error', 500)
  }
}
