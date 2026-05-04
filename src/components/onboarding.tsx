'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import { useState, useTransition } from 'react'
import { setIdentity } from '../actions'
import { DATE_LOCALE, t } from '../lib/i18n'
import { applyServerSnapshot, selectLocale, useOfflineState } from '../lib/offline-store'
import type { Identity, Locale } from '../lib/types'
import { Intro } from './intro'
import { OfflineGate } from './offline-gate'

export function Onboarding() {
  const state = useOfflineState()
  const locale = selectLocale(state)
  const [pending, start] = useTransition()
  const [picked, setPicked] = useState<Identity | null>(null)
  const [introDismissed, setIntroDismissed] = useState(false)
  const showPicker = state.introSeen || introDismissed

  const pick = (who: Identity) => {
    setPicked(who)
    window.setTimeout(() => {
      start(async () => {
        try {
          applyServerSnapshot(await setIdentity(who))
        } catch {
          setPicked(null)
        }
      })
    }, 320)
  }

  return (
    <>
      <div className='online-only'>
        {!state.hydrated ?
          null
        : showPicker ?
          <Picker
            key={introDismissed ? 'after-intro' : 'initial'}
            picked={picked}
            pending={pending}
            onPick={pick}
            locale={locale}
          />
        : <Intro onDone={() => setIntroDismissed(true)} locale={locale} />}
      </div>
      <div className='offline-only'>
        <OfflineGate />
      </div>
    </>
  )
}

function Picker({ picked, pending, onPick, locale }: { picked: Identity | null; pending: boolean; onPick: (w: Identity) => void; locale: Locale }) {
  return (
    <motion.main
      animate={picked ? { opacity: 0, y: -16, filter: 'blur(4px)' } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'
    >
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className='flex items-baseline justify-between'
      >
        <span className='text-ink-faint text-xs'>{t(locale, 'onboarding.header')}</span>
        <span className='text-ink-faint text-xs'>
          {new Intl.DateTimeFormat(DATE_LOCALE[locale], {
            day: '2-digit',
            month: 'short'
          }).format(new Date())}
        </span>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className='relative mx-auto mt-6 w-[58%] max-w-55'
      >
        <Image
          src='/onboarding-hero-light.png'
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
          src='/onboarding-hero-dark.png'
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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className='mt-6'
      >
        <h1 className='font-display text-[34px] leading-[0.95] tracking-tight'>
          {t(locale, 'onboarding.titleLine1')}
          <br />
          <span className='text-clay italic'>{t(locale, 'onboarding.titleItalic')}</span> {t(locale, 'onboarding.titleLine2')}
        </h1>
        <p className='font-display text-ink-soft mt-3 max-w-[28ch] text-sm'>{t(locale, 'onboarding.subtitle')}</p>
      </motion.div>

      <div className='mt-auto grid grid-cols-2 gap-2.5'>
        <PersonCard
          who='henrique'
          label='Henrique'
          accent='sage'
          delay={0.2}
          onPick={onPick}
          pending={pending}
          picked={picked}
          locale={locale}
        />
        <PersonCard
          who='pietra'
          label='Pietra'
          accent='clay'
          delay={0.3}
          onPick={onPick}
          pending={pending}
          picked={picked}
          locale={locale}
        />
      </div>

      <p className='text-ink-faint mt-4 text-center text-xs'>{t(locale, 'onboarding.savedOnDevice')}</p>
    </motion.main>
  )
}

function PersonCard({
  who,
  label,
  accent,
  delay,
  onPick,
  pending,
  picked,
  locale
}: {
  who: Identity
  label: string
  accent: 'sage' | 'clay'
  delay: number
  onPick: (w: Identity) => void
  pending: boolean
  picked: Identity | null
  locale: Locale
}) {
  const ring = accent === 'sage' ? 'hover:bg-sage-soft' : 'hover:bg-clay-soft'
  const textClass = accent === 'sage' ? 'text-sage' : 'text-clay'
  const isPicked = picked === who
  const isOther = picked !== null && picked !== who
  return (
    <motion.button
      type='button'
      initial={{ opacity: 0, y: 16 }}
      animate={
        isPicked ? { opacity: 1, y: 0, scale: 1.04 }
        : isOther ?
          { opacity: 0.2, y: 0, scale: 0.96 }
        : { opacity: 1, y: 0, scale: 1 }
      }
      transition={{ duration: 0.6, delay: picked ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.97 }}
      disabled={pending || picked !== null}
      onClick={() => onPick(who)}
      className={`group flex flex-col gap-2.5 rounded-xl p-2.5 text-left transition-all duration-300 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 ${ring} ${
        accent === 'sage' ? 'focus-visible:bg-sage-soft' : 'focus-visible:bg-clay-soft'
      } disabled:opacity-50`}
    >
      <div className='relative w-full'>
        <Image
          src={`/avatar-${who}-light.png`}
          alt=''
          aria-hidden
          width={400}
          height={500}
          unoptimized
          className='theme-light-only h-auto w-full select-none'
          draggable={false}
        />
        <Image
          src={`/avatar-${who}-dark.png`}
          alt=''
          aria-hidden
          width={400}
          height={500}
          unoptimized
          className='theme-dark-only h-auto w-full select-none'
          draggable={false}
        />
      </div>
      <div className='flex items-baseline justify-between px-0.5 pb-0.5'>
        <span className={`font-display text-xl ${textClass}`}>{label}</span>
        <span className='text-ink-faint text-xs'>{t(locale, 'onboarding.pickMe')}</span>
      </div>
    </motion.button>
  )
}
