'use client'

import Image from 'next/image'
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
      <div className='flex-1 overflow-hidden'>
        <main className='relative flex h-full flex-col items-center justify-center px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
          <div className='relative w-[58%] max-w-60 animate-pulse'>
            <Image
              src='/splash-light.png'
              alt=''
              aria-hidden
              width={480}
              height={480}
              priority
              unoptimized
              className='theme-light-only h-auto w-full select-none'
              draggable={false}
            />
            <Image
              src='/splash-dark.png'
              alt=''
              aria-hidden
              width={480}
              height={480}
              priority
              unoptimized
              className='theme-dark-only h-auto w-full select-none'
              draggable={false}
            />
          </div>
        </main>
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
