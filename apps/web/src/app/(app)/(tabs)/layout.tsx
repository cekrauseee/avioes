'use client'

import { NavBar } from '@/components/nav-bar'
import { SwipeableContent } from '@/components/swipeable-content'
import { useOfflineState } from '@/lib/offline-store'

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const state = useOfflineState()

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <SwipeableContent>{children}</SwipeableContent>
      <div className='overflow-hidden transition-[opacity,max-height] duration-200 ease-out lg:pointer-events-none lg:max-h-0 lg:opacity-0'>
        <NavBar who={state.identity!} />
      </div>
    </div>
  )
}
