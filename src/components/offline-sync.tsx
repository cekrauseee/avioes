'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useOfflineSync } from '../lib/offline-store'
import { useRealtimeSync } from '../lib/realtime'
import { useAppStore } from '../lib/store/app-store'

const SHELL_ROUTES = ['/', '/diary', '/scoreboard']

export function OfflineSync() {
  const router = useRouter()
  const pathname = usePathname()
  const activeGroupId = useAppStore((s) => s.activeGroupId)

  useOfflineSync()
  useRealtimeSync(activeGroupId)

  useEffect(() => {
    for (const route of SHELL_ROUTES) router.prefetch(route)
  }, [pathname, router])

  return null
}
