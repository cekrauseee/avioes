'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'
import { t } from '../lib/i18n'
import { IconRefresh } from './icons'
import { MOTION_TRANSITION, withMotionDelay } from '../lib/motion'
import { selectLocale, useOfflineState } from '../lib/offline-store'

export function OfflineGate() {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)
  const state = useOfflineState()
  const locale = selectLocale(state)

  const retry = () => {
    setRetrying(true)
    startTransition(() => {
      router.refresh()
      window.setTimeout(() => setRetrying(false), 600)
    })
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={MOTION_TRANSITION.navIndicator}
      className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'
    >
      <header className='flex items-baseline justify-between'>
        <span className='text-ink-faint text-xs'>{t(locale, 'offline.noSignal')}</span>
        <span className='text-ink-faint text-xs'>{t(locale, 'offline.delayed')}</span>
      </header>

      <div className='flex flex-1 flex-col items-center justify-center text-center'>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={withMotionDelay(MOTION_TRANSITION.header, 0.05)}
          className='relative w-[64%] max-w-[240px]'
        >
          <Image
            src='/airplane-offline-light.png'
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
            src='/airplane-offline-dark.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            priority
            unoptimized
            className='theme-dark-only h-auto w-full select-none'
            draggable={false}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={withMotionDelay(MOTION_TRANSITION.offlineStagger, 0.15)}
          className='font-display mt-8 text-[34px] leading-[0.95] tracking-tight'
        >
          {t(locale, 'offline.titleLine1')}
          <br />
          <span className='text-clay italic'>{t(locale, 'offline.titleItalic')}</span>.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={withMotionDelay(MOTION_TRANSITION.offlineStagger, 0.22)}
          className='font-display text-ink-soft mt-3 max-w-[28ch] text-sm italic'
        >
          {t(locale, 'offline.body')}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withMotionDelay(MOTION_TRANSITION.offlineStagger, 0.3)}
        className='mt-4 flex flex-col items-center gap-1.5'
      >
        <button
          type='button'
          onClick={retry}
          disabled={retrying}
          className='bg-paper text-ink hover:bg-line/40 focus-visible:bg-line/40 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm transition-colors active:scale-[0.99] disabled:opacity-50'
        >
          <motion.span
            className='leading-none'
            animate={retrying ? { rotate: 360 } : { rotate: 0 }}
            transition={retrying ? MOTION_TRANSITION.spinner : MOTION_TRANSITION.screen}
          >
            <IconRefresh size={16} />
          </motion.span>
          <span className='font-display'>{t(locale, 'offline.retry')}</span>
        </button>
        <p className='text-ink-faint mt-1 max-w-[28ch] text-center text-[11px]'>{t(locale, 'offline.savedOnDevice')}</p>
      </motion.div>
    </motion.main>
  )
}
