import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'shiftswap-dev-secret-change-in-production'
const TOKEN_EXPIRY = '7d'

export interface TokenPayload {
  memberId: string
  organisationId: string
  role: 'MANAGER' | 'STAFF'
  name: string
  email: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(): Promise<TokenPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  // Verify the member still exists
  const member = await prisma.member.findUnique({
    where: { id: session.memberId },
  })
  if (!member) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireManager(): Promise<TokenPayload> {
  const session = await requireAuth()
  if (session.role !== 'MANAGER') {
    throw new Error('Forbidden: Manager access required')
  }
  return session
}
