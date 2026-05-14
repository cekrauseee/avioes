'use client'

import { t, type TKey } from '@airplanes/i18n'
import { AnimatePresence, motion } from 'motion/react'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { MOTION_TRANSITION } from '../lib/motion'
import { NavDirectionProvider } from '../lib/nav-direction'
import { selectLocale, useOfflineRuntime, useOfflineState } from '../lib/offline-store'
import { OfflineSync } from './offline-sync'
import { PwaRegister } from './pwa-register'
import { StorageGate } from './storage-gate'

const PAGE_TITLE_KEY: Record<string, TKey> = {
  '/': 'nav.count',
  '/diary': 'diary.title',
  '/scoreboard': 'scoreboard.title',
  '/settings': 'settings.title'
}

export function AppRuntime({ children }: { children: React.ReactNode }) {
  useOfflineRuntime()
  const state = useOfflineState()
  const pathname = usePathname()
  const locale = selectLocale(state)
  const showLoading = !state.hydrated && pathname !== '/auth' && pathname !== '/landing'

  useEffect(() => {
    const key = PAGE_TITLE_KEY[pathname]
    if (!key) return
    document.title = `${t(locale, key)}`
  }, [locale, pathname])

  return (
    <AnimatePresence mode='wait'>
      {showLoading ?
        <motion.div
          key='loading'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={MOTION_TRANSITION.fastFade}
          className='flex-1 overflow-hidden'
        >
          <main className='relative flex h-full flex-col items-center justify-center px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
            <div className='bg-sage h-2.5 w-2.5 animate-pulse rounded-full' />
            <p className='font-display text-ink-soft mt-6 text-sm italic'>{t(locale, 'loading.text')}</p>
          </main>
        </motion.div>
      : <NavDirectionProvider>
          <div
            className='flex min-h-0 flex-1 flex-col transition-opacity duration-180 ease-out'
            style={{ opacity: state.localeFading ? 0 : 1 }}
          >
            <div
              className={
                pathname === '/landing' ? 'flex min-h-0 w-full flex-1 flex-col' : (
                  'mx-auto flex min-h-0 w-full max-w-[420px] flex-1 flex-col overflow-hidden lg:max-w-none'
                )
              }
            >
              {state.storageError ?
                <StorageGate />
              : children}
            </div>
          </div>
          {!state.storageError && <OfflineSync />}
          <PwaRegister />
        </NavDirectionProvider>
      }
    </AnimatePresence>
  )
}
