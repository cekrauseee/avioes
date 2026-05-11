'use client'

import PusherClient from 'pusher-js'
import { useEffect } from 'react'
import { store } from './store/app-store'

let client: PusherClient | null = null

function getPusherClient(): PusherClient | null {
  if (client) return client
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  if (!key || !cluster) return null
  client = new PusherClient(key, { cluster, forceTLS: true })
  return client
}

export function useRealtimeSync(groupId: string | null): void {
  useEffect(() => {
    if (!groupId) return
    const pusher = getPusherClient()
    if (!pusher) return

    const channelName = `group-${groupId}`
    const channel = pusher.subscribe(channelName)

    channel.bind('sync', () => {
      store.setState({ lastSyncOk: null })
      void store.getState().drainOnce()
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
    }
  }, [groupId])
}

export function useRealtimeNotifications(userId: string | null, onNotification: () => void): void {
  useEffect(() => {
    if (!userId) return
    const pusher = getPusherClient()
    if (!pusher) return

    const channelName = `user-${userId}`
    const channel = pusher.subscribe(channelName)
    channel.bind('notification', onNotification)

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
    }
  }, [userId, onNotification])
}
