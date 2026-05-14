'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useOfflineSync } from '../lib/offline-store'

const SHELL_ROUTES = ['/', '/diary', '/scoreboard']

export function OfflineSync() {
  const router = useRouter()
  const pathname = usePathname()

  useOfflineSync()

  useEffect(() => {
    for (const route of SHELL_ROUTES) router.prefetch(route)
  }, [pathname, router])

  return null
}
