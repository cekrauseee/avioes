'use client'

import { DesktopSidebar } from '@/components/desktop-sidebar'
import { useOfflineState } from '@/lib/offline-store'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const state = useOfflineState()

  return (
    <div className='flex min-h-0 flex-1 flex-col lg:flex-row'>
      {state.identity && <DesktopSidebar who={state.identity} />}
      <div className='flex min-h-0 flex-1 flex-col'>{children}</div>
    </div>
  )
}
