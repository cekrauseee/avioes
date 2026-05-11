import 'server-only'

import webpush from 'web-push'
import { deletePushSubscriptionByEndpoint, readPushSubscriptionsForUser } from './store'

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:noreply@example.com'

function isConfigured(): boolean {
  return Boolean(vapidPublic && vapidPrivate)
}

let configured = false

function ensureConfigured(): boolean {
  if (configured) return true
  if (!isConfigured()) return false
  webpush.setVapidDetails(vapidSubject, vapidPublic!, vapidPrivate!)
  configured = true
  return true
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }): Promise<void> {
  if (!ensureConfigured()) return

  const subs = await readPushSubscriptionsForUser(userId)
  if (subs.length === 0) return

  const data = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, data)
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await deletePushSubscriptionByEndpoint(sub.endpoint)
        }
      }
    })
  )
}
