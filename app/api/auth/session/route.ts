import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success } from '@/lib/utils'

// GET /api/auth/session — Get current session
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return success({ authenticated: false })
    }

    return success({
      authenticated: true,
      member: {
        id: session.memberId,
        name: session.name,
        email: session.email,
        role: session.role,
      },
      organisationId: session.organisationId,
    })
  } catch {
    return success({ authenticated: false })
  }
}

// POST /api/auth/session — Logout
export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
