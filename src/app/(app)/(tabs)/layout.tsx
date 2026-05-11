'use client'

import { NavBar } from '@/components/nav-bar'
import { SwipeableContent } from '@/components/swipeable-content'
import { useOfflineState } from '@/lib/offline-store'

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const state = useOfflineState()

  return (
    <>
      <SwipeableContent>{children}</SwipeableContent>
      <NavBar who={state.identity!} />
    </>
  )
}
