'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { NavDirectionProvider } from '../lib/nav-direction'
import { t, type TKey } from '../lib/i18n'
import { selectLocale, useOfflineRuntime, useOfflineState } from '../lib/offline-store'
import { NavBar } from './nav-bar'
import { OfflineSync } from './offline-sync'
import { PwaRegister } from './pwa-register'
import { StorageGate } from './storage-gate'
import { SwipeableContent } from './swipeable-content'

const PAGE_TITLE_KEY: Record<string, TKey> = {
  '/': 'nav.count',
  '/diary': 'diary.title',
  '/scoreboard': 'scoreboard.title',
  '/settings': 'settings.title',
}

export function AppRuntime({ children }: { children: React.ReactNode }) {
  useOfflineRuntime()
  const state = useOfflineState()
  const pathname = usePathname()
  const locale = selectLocale(state)
  const inApp = state.identity && state.activeGroupId
  const showAppNav = Boolean(inApp) && pathname !== '/auth' && !pathname.startsWith('/groups')

  useEffect(() => {
    const key = PAGE_TITLE_KEY[pathname]
    if (!key) return
    document.title = `${t(locale, key)} \\ Airplanes`
  }, [locale, pathname])

  return (
    <NavDirectionProvider>
      <div
        className='flex flex-1 flex-col transition-opacity duration-180 ease-out'
        style={{ opacity: state.localeFading ? 0 : 1 }}
      >
        <div className='mx-auto flex w-full max-w-[420px] flex-1 flex-col overflow-hidden'>
          {state.storageError ?
            <StorageGate />
          : <SwipeableContent disabled={!showAppNav || pathname === '/settings'}>{children}</SwipeableContent>}
        </div>
        {showAppNav && !state.storageError && <NavBar who={state.identity!} />}
      </div>
      {!state.storageError && <OfflineSync />}
      <PwaRegister />
    </NavDirectionProvider>
  )
}
