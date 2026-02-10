import { NextResponse } from 'next/server'

export function success(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export function unauthorized(message = 'Unauthorized') {
  return error(message, 401)
}

export function forbidden(message = 'Forbidden') {
  return error(message, 403)
}

export function notFound(message = 'Not found') {
  return error(message, 404)
}

export function conflict(message = 'Conflict') {
  return error(message, 409)
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTime(start: string, end: string): string {
  return `${start} - ${end}`
}

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
