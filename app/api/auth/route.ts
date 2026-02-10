import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, createToken, verifyPassword } from '@/lib/auth'
import { success, error, generateJoinCode } from '@/lib/utils'

// POST /api/auth/register — Register manager + create org, or staff joins org
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'create-org') {
      return await createOrganisation(body)
    } else if (action === 'join-org') {
      return await joinOrganisation(body)
    } else if (action === 'login') {
      return await login(body)
    }

    return error('Invalid action')
  } catch (e: unknown) {
    console.error('Auth error:', e)
    return error('Internal server error', 500)
  }
}

async function createOrganisation(body: {
  orgName: string
  name: string
  email: string
  password: string
}) {
  const { orgName, name, email, password } = body

  if (!orgName || !name || !email || !password) {
    return error('All fields are required')
  }
  if (password.length < 6) {
    return error('Password must be at least 6 characters')
  }

  // Generate unique join code
  let joinCode = generateJoinCode()
  let attempts = 0
  while (attempts < 10) {
    const existing = await prisma.organisation.findUnique({ where: { joinCode } })
    if (!existing) break
    joinCode = generateJoinCode()
    attempts++
  }

  const passwordHash = await hashPassword(password)

  const org = await prisma.organisation.create({
    data: {
      name: orgName,
      joinCode,
      members: {
        create: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role: 'MANAGER',
        },
      },
    },
    include: { members: true },
  })

  const member = org.members[0]
  const token = createToken({
    memberId: member.id,
    organisationId: org.id,
    role: 'MANAGER',
    name: member.name,
    email: member.email,
  })

  const response = success({
    member: { id: member.id, name: member.name, email: member.email, role: member.role },
    organisation: { id: org.id, name: org.name, joinCode: org.joinCode },
    token,
  })

  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}

async function joinOrganisation(body: {
  joinCode: string
  name: string
  email: string
  password: string
  staffRole: string
}) {
  const { joinCode, name, email, password, staffRole } = body

  if (!joinCode || !name || !email || !password || !staffRole) {
    return error('All fields are required')
  }
  if (password.length < 6) {
    return error('Password must be at least 6 characters')
  }

  const org = await prisma.organisation.findUnique({ where: { joinCode: joinCode.toUpperCase() } })
  if (!org) {
    return error('Invalid join code')
  }

  // Check if email already used in this org
  const existing = await prisma.member.findUnique({
    where: { email_organisationId: { email: email.toLowerCase(), organisationId: org.id } },
  })
  if (existing) {
    return error('This email is already registered in this organisation')
  }

  const passwordHash = await hashPassword(password)

  const member = await prisma.member.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'STAFF',
      staffRole,
      organisationId: org.id,
    },
  })

  const token = createToken({
    memberId: member.id,
    organisationId: org.id,
    role: 'STAFF',
    name: member.name,
    email: member.email,
  })

  const response = success({
    member: { id: member.id, name: member.name, email: member.email, role: member.role, staffRole: member.staffRole },
    organisation: { id: org.id, name: org.name },
    token,
  })

  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}

async function login(body: { email: string; password: string }) {
  const { email, password } = body

  if (!email || !password) {
    return error('Email and password are required')
  }

  // Find all members with this email
  const members = await prisma.member.findMany({
    where: { email: email.toLowerCase() },
    include: { organisation: true },
  })

  if (members.length === 0) {
    return error('Invalid email or password')
  }

  // Try each member (they could be in multiple orgs)
  for (const member of members) {
    const valid = await verifyPassword(password, member.passwordHash)
    if (valid) {
      const token = createToken({
        memberId: member.id,
        organisationId: member.organisationId,
        role: member.role,
        name: member.name,
        email: member.email,
      })

      const response = success({
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          staffRole: member.staffRole,
        },
        organisation: { id: member.organisation.id, name: member.organisation.name },
        token,
      })

      response.cookies.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })

      return response
    }
  }

  return error('Invalid email or password')
}
