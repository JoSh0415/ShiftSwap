import webpush from 'web-push'
import { prisma } from './db'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:admin@shiftswap.app', VAPID_PUBLIC, VAPID_PRIVATE)
}

interface NotificationPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

export async function sendNotificationToMember(memberId: string, payload: NotificationPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { memberId },
  })

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode
        if (statusCode === 410 || statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        }
        throw error
      }
    })
  )

  return results
}

export async function sendNotificationToRole(
  organisationId: string,
  role: 'MANAGER' | 'STAFF',
  payload: NotificationPayload,
  excludeMemberId?: string
) {
  const members = await prisma.member.findMany({
    where: {
      organisationId,
      role,
      ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
    },
    select: { id: true },
  })

  const results = await Promise.allSettled(
    members.map((m) => sendNotificationToMember(m.id, payload))
  )

  return results
}

export async function sendNotificationToOrg(
  organisationId: string,
  payload: NotificationPayload,
  excludeMemberId?: string
) {
  const members = await prisma.member.findMany({
    where: {
      organisationId,
      ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
    },
    select: { id: true },
  })

  const results = await Promise.allSettled(
    members.map((m) => sendNotificationToMember(m.id, payload))
  )

  return results
}
