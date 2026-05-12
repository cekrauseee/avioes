'use client'

import { NavBar } from '@/components/nav-bar'
import { SwipeableContent } from '@/components/swipeable-content'
import { useOfflineState } from '@/lib/offline-store'

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const state = useOfflineState()

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <SwipeableContent>{children}</SwipeableContent>
      <div className='transition-[opacity,max-height] overflow-hidden duration-200 ease-out lg:max-h-0 lg:opacity-0 lg:pointer-events-none'>
        <NavBar who={state.identity!} />
      </div>
    </div>
  )
}
