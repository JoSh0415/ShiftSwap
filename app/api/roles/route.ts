import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, forbidden } from '@/lib/utils'

// GET /api/roles — Get all roles for the current org
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const roles = await prisma.orgRole.findMany({
      where: { organisationId: session.organisationId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: { select: { memberRoles: true } },
      },
    })

    return success({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        memberCount: r._count.memberRoles,
      })),
    })
  } catch (e: unknown) {
    console.error('Get roles error:', e)
    return error('Internal server error', 500)
  }
}

// POST /api/roles — Create a new role (manager only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (session.role !== 'MANAGER') return forbidden()

    const { name } = await req.json()
    if (!name || !name.trim()) return error('Role name is required')

    // Check for duplicate
    const existing = await prisma.orgRole.findUnique({
      where: {
        name_organisationId: {
          name: name.trim(),
          organisationId: session.organisationId,
        },
      },
    })
    if (existing) return error('A role with this name already exists')

    const role = await prisma.orgRole.create({
      data: {
        name: name.trim(),
        organisationId: session.organisationId,
      },
    })

    return success({ role }, 201)
  } catch (e: unknown) {
    console.error('Create role error:', e)
    return error('Internal server error', 500)
  }
}

// DELETE /api/roles — Delete a role (manager only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (session.role !== 'MANAGER') return forbidden()

    const { roleId } = await req.json()
    if (!roleId) return error('roleId is required')

    const role = await prisma.orgRole.findFirst({
      where: { id: roleId, organisationId: session.organisationId },
    })
    if (!role) return error('Role not found', 404)

    await prisma.orgRole.delete({ where: { id: roleId } })

    return success({ deleted: true })
  } catch (e: unknown) {
    console.error('Delete role error:', e)
    return error('Internal server error', 500)
  }
}

// PATCH /api/roles — Update member role assignments (staff or manager)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const { roleIds } = await req.json() as { roleIds: string[] }
    if (!Array.isArray(roleIds)) return error('roleIds must be an array')

    // Verify all roles belong to this org
    const validRoles = await prisma.orgRole.findMany({
      where: { id: { in: roleIds }, organisationId: session.organisationId },
      select: { id: true },
    })
    const validIds = new Set(validRoles.map((r) => r.id))

    // Delete existing assignments
    await prisma.memberOrgRole.deleteMany({
      where: { memberId: session.memberId },
    })

    // Create new assignments
    if (roleIds.length > 0) {
      await prisma.memberOrgRole.createMany({
        data: roleIds
          .filter((id) => validIds.has(id))
          .map((orgRoleId) => ({
            memberId: session.memberId,
            orgRoleId,
          })),
      })
    }

    return success({ updated: true })
  } catch (e: unknown) {
    console.error('Update member roles error:', e)
    return error('Internal server error', 500)
  }
}
