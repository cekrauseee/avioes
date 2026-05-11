'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { t, type TKey } from '../lib/i18n'
import { NavDirectionProvider } from '../lib/nav-direction'
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
  '/world': 'world.title'
}

export function AppRuntime({ children }: { children: React.ReactNode }) {
  useOfflineRuntime()
  const state = useOfflineState()
  const pathname = usePathname()
  const locale = selectLocale(state)
  const hasIdentity = Boolean(state.identity)
  const hasActiveGroup = Boolean(state.activeGroupId)
  const showAppNav =
    hasIdentity &&
    pathname !== '/auth' &&
    !pathname.startsWith('/design') &&
    !pathname.startsWith('/groups') &&
    !pathname.startsWith('/settings/') &&
    !pathname.startsWith('/onboarding') &&
    (hasActiveGroup || pathname === '/world')

  useEffect(() => {
    const key = PAGE_TITLE_KEY[pathname]
    if (!key) return
    document.title = `${t(locale, key)}`
  }, [locale, pathname])

  if (!state.hydrated) {
    return (
      <div className='flex flex-1 items-center justify-center'>
        <div className='animate-pulse opacity-40'>
          <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.7 7.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.7.5-1.1z' />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <NavDirectionProvider>
      <div
        className='flex min-h-0 flex-1 flex-col transition-opacity duration-180 ease-out'
        style={{ opacity: state.localeFading ? 0 : 1 }}
      >
        <div className='mx-auto flex min-h-0 w-full max-w-[420px] flex-1 flex-col overflow-hidden'>
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
