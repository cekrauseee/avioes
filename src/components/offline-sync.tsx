'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { onSyncAck, useOfflineSync } from '../lib/offline-queue'

const SHELL_ROUTES = ['/', '/diary', '/scoreboard']

export function OfflineSync() {
  const router = useRouter()
  const pathname = usePathname()

  useOfflineSync()

  useEffect(() => {
    for (const route of SHELL_ROUTES) router.prefetch(route)
  }, [pathname, router])

  useEffect(() => {
    return onSyncAck(() => {
      router.refresh()
      for (const route of SHELL_ROUTES) router.prefetch(route)
    })
  }, [router])

  return null
}
