import 'server-only'

import Pusher from 'pusher'

let instance: Pusher | null = null

function getPusher(): Pusher | null {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) return null
  if (instance) return instance
  instance = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true
  })
  return instance
}

export function publishGroupUpdate(groupId: string): void {
  const pusher = getPusher()
  if (!pusher) return
  pusher.trigger(`group-${groupId}`, 'sync', {}).catch(() => {})
}

export function publishUserNotification(userId: string): void {
  const pusher = getPusher()
  if (!pusher) return
  pusher.trigger(`user-${userId}`, 'notification', {}).catch(() => {})
}
