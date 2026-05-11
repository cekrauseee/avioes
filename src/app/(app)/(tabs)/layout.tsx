'use client'

import { usePathname } from 'next/navigation'
import { NavBar } from '@/components/nav-bar'
import { SwipeableContent } from '@/components/swipeable-content'
import { useOfflineState } from '@/lib/offline-store'

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const state = useOfflineState()
  const pathname = usePathname()

  return (
    <>
      <SwipeableContent disabled={pathname === '/settings'}>
        {children}
      </SwipeableContent>
      <NavBar who={state.identity!} />
    </>
  )
}
