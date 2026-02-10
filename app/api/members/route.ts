import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, forbidden } from '@/lib/utils'

// GET /api/members — Get members for current org
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const members = await prisma.member.findMany({
      where: { organisationId: session.organisationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffRole: true,
        createdAt: true,
        memberOrgRoles: {
          select: {
            orgRole: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })

    return success({
      members: members.map((m) => ({
        ...m,
        orgRoles: m.memberOrgRoles.map((mr) => mr.orgRole),
        memberOrgRoles: undefined,
      })),
    })
  } catch (e: unknown) {
    console.error('Get members error:', e)
    return error('Internal server error', 500)
  }
}

// DELETE /api/members — Remove a member
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (session.role !== 'MANAGER') return forbidden()

    const { memberId } = await req.json()
    if (!memberId) return error('memberId is required')

    // Can't remove yourself
    if (memberId === session.memberId) {
      return error("You can't remove yourself")
    }

    const member = await prisma.member.findFirst({
      where: { id: memberId, organisationId: session.organisationId },
    })
    if (!member) return error('Member not found', 404)

    await prisma.member.delete({ where: { id: memberId } })

    return success({ deleted: true })
  } catch (e: unknown) {
    console.error('Delete member error:', e)
    return error('Internal server error', 500)
  }
}
