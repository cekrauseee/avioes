'use client'

import { usePathname, useRouter } from 'next/navigation'
import { startTransition, useEffect } from 'react'
import { useNavDirection } from '../lib/nav-direction'
import { selectLocale, useOfflineState } from '../lib/offline-store'
import { getMemberColor, type Identity } from '../lib/types'
import { ToolbarTabs, type ToolbarTabItem } from './toolbar-tabs'

const links = [
  { id: '/', href: '/', labelKey: 'nav.count' },
  { id: '/diary', href: '/diary', labelKey: 'nav.diary' },
  { id: '/scoreboard', href: '/scoreboard', labelKey: 'nav.scoreboard' },
  { id: '/world', href: '/world', labelKey: 'nav.world' },
  { id: '/settings', href: '/settings', labelKey: 'nav.settings' }
] satisfies ToolbarTabItem<string>[]

export function Nav({ who }: { who: Identity }) {
  const pathname = usePathname()
  const router = useRouter()
  const { set: setDirection } = useNavDirection()
  const state = useOfflineState()
  const accent = getMemberColor(who, state.groupMembers)
  const locale = selectLocale(state)

  const currentIndex = links.findIndex((link) => link.id === pathname)

  useEffect(() => {
    const id = window.setTimeout(() => {
      for (const link of links) {
        if (link.href !== pathname) router.prefetch(link.href)
      }
    }, 250)
    return () => window.clearTimeout(id)
  }, [pathname, router])

  return (
    <ToolbarTabs
      items={links}
      activeId={pathname}
      accentClass={accent.bg}
      locale={locale}
      indicatorLayoutId='nav-active'
      onSelect={(id) => {
        const targetIndex = links.findIndex((link) => link.id === id)
        if (targetIndex !== currentIndex) setDirection(targetIndex > currentIndex ? 1 : -1)
        startTransition(() => router.push(id))
      }}
    />
  )
}
