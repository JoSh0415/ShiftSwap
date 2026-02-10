import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/utils'

// POST /api/push — Subscribe to push notifications
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const { subscription } = await req.json()
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return error('Invalid push subscription')
    }

    // Upsert the subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        memberId: session.memberId,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        memberId: session.memberId,
      },
    })

    return success({ subscribed: true })
  } catch (e: unknown) {
    console.error('Push subscribe error:', e)
    return error('Internal server error', 500)
  }
}

// DELETE /api/push — Unsubscribe from push notifications
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const { endpoint } = await req.json()
    if (!endpoint) return error('Endpoint required')

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, memberId: session.memberId },
    })

    return success({ unsubscribed: true })
  } catch (e: unknown) {
    console.error('Push unsubscribe error:', e)
    return error('Internal server error', 500)
  }
}
