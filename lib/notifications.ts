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

/**
 * Send notifications only to staff members who have a specific OrgRole assigned.
 * Falls back to all staff if no members have the role.
 */
export async function sendNotificationToMembersByOrgRole(
  organisationId: string,
  orgRoleId: string,
  payload: NotificationPayload,
  excludeMemberId?: string
) {
  // Find staff members with this org role assigned
  const memberRoles = await prisma.memberOrgRole.findMany({
    where: {
      orgRoleId,
      member: {
        organisationId,
        role: 'STAFF',
        ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
      },
    },
    select: { memberId: true },
  })

  // If no members have this role, fall back to notifying all staff
  if (memberRoles.length === 0) {
    return sendNotificationToRole(organisationId, 'STAFF', payload, excludeMemberId)
  }

  const results = await Promise.allSettled(
    memberRoles.map((mr) => sendNotificationToMember(mr.memberId, payload))
  )

  return results
}
