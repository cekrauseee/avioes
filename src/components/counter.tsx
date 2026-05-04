'use client'

import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import Image from 'next/image'
import { startTransition, useEffect, useRef, useState } from 'react'
import { clearIdentity } from '../actions'
import { t } from '../lib/i18n'
import { addAirplane, applyLocalIdentity, isOffline, selectEvents, selectLocale, selectPendingCount, undoAirplane, useOfflineState } from '../lib/offline-store'
import { totals } from '../lib/streaks'
import { IDENTITIES } from '../lib/types'
import { AppShell } from './app-shell'
import { Onboarding } from './onboarding'
import { PlaneArc, type ArcKey } from './plane-arc'
import { SyncStatus } from './sync-status'
import { ThemeToggle } from './theme-toggle'

export function Counter() {
  const state = useOfflineState()
  const who = state.identity
  if (!who) return <Onboarding />

  return (
    <CounterContent
      state={state}
      who={who}
    />
  )
}

function CounterContent({ state, who }: { state: ReturnType<typeof useOfflineState>; who: NonNullable<ReturnType<typeof useOfflineState>['identity']> }) {
  const me = IDENTITIES[who]
  const partner = who === 'henrique' ? 'pietra' : 'henrique'
  const partnerName = IDENTITIES[partner].label
  const myName = me.label
  const locale = selectLocale(state)

  const events = selectEvents(state)
  const tt = totals(events)
  const offline = isOffline(state)
  const pendingCount = selectPendingCount(state)
  const syncVisible = offline
  const reducedMotion = useReducedMotion()
  const tokenInitial = reducedMotion ? { opacity: 0 } : { opacity: 0, y: 2 }
  const tokenEnter = reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
  const tokenExit = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -2 }
  const tokenTransition = { duration: 0.15, ease: [0.22, 1, 0.36, 1] as const }

  const display = tt[who]
  const totalDisplay = tt.henrique + tt.pietra
  const canUndo = display > 0

  const [flights, setFlights] = useState<ArcKey[]>([])
  const spring = useSpring(display, { stiffness: 220, damping: 22 })
  const animateNextRef = useRef(false)
  useEffect(() => {
    if (animateNextRef.current) {
      animateNextRef.current = false
      spring.set(display)
    } else {
      spring.jump(display)
    }
  }, [display, spring])
  const displayed = useTransform(spring, (v) => Math.round(v).toString())

  const hydrated = state.hydrated

  const tap = () => {
    setFlights((f) => [...f.slice(-2), { id: Date.now(), from: Math.random() > 0.5 ? 'left' : 'right' }])
    animateNextRef.current = true
    addAirplane(who)
  }

  const undo = () => {
    if (!canUndo) return
    animateNextRef.current = true
    undoAirplane(who)
  }

  const switchIdentity = () => {
    if (offline || pendingCount > 0) return
    startTransition(async () => {
      await clearIdentity()
      applyLocalIdentity(null)
    })
  }

  return (
    <AppShell>
      <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
        <PlaneArc flights={flights} />

        <header className='relative z-10 flex items-center justify-between'>
          <button
            type='button'
            onClick={switchIdentity}
            disabled={offline || pendingCount > 0}
            className='group hover:bg-line/40 focus-visible:bg-line/40 -ml-2 inline-flex items-center gap-2 rounded-full px-2 py-1 transition-colors disabled:opacity-60'
          >
            <span
              className={`h-2 w-2 rounded-full ${me.bg} transition-transform group-hover:scale-125 group-focus-visible:scale-125`}
              aria-hidden
            />
            <span className='font-display text-sm'>{myName}</span>
            <span className='text-ink-faint group-hover:text-ink-soft group-focus-visible:text-ink-soft text-xs transition-colors'>
              {offline ?
                t(locale, 'counter.offline')
              : pendingCount > 0 ?
                t(locale, 'counter.pending')
              : t(locale, 'counter.switch')}
            </span>
          </button>
          <div className='flex items-center gap-2'>
            <SyncStatus />
            {syncVisible && (
              <span
                aria-hidden
                className='text-ink-faint text-xs'
              >
                ·
              </span>
            )}
            <span className='text-ink-faint inline-flex items-baseline gap-[0.25em] text-xs whitespace-nowrap'>
              {hydrated ?
                <AnimatePresence
                  mode='wait'
                  initial={false}
                >
                  <motion.span
                    key={totalDisplay}
                    initial={tokenInitial}
                    animate={tokenEnter}
                    exit={tokenExit}
                    transition={tokenTransition}
                    className='inline-block'
                  >
                    {totalDisplay}
                  </motion.span>
                </AnimatePresence>
              : <span className='inline-block'>{totalDisplay}</span>}
              <span>{t(locale, 'counter.total')}</span>
            </span>
            <ThemeToggle />
          </div>
        </header>

        <button
          type='button'
          onClick={tap}
          className='relative z-10 mt-4 flex flex-1 flex-col items-end justify-center text-right transition-transform select-none active:scale-[0.99]'
          aria-label={t(locale, 'counter.ariaLabel')}
        >
          <AnimatePresence>
            {display === 0 && tt[partner] === 0 && (
              <motion.div
                key='empty-counter'
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden
                className='pointer-events-none absolute top-1/2 left-0 w-[48%] max-w-50 -translate-y-1/2'
              >
                <Image
                  src='/empty-counter-light.png'
                  alt=''
                  aria-hidden
                  width={400}
                  height={400}
                  unoptimized
                  className='theme-light-only h-auto w-full select-none'
                  draggable={false}
                />
                <Image
                  src='/empty-counter-dark.png'
                  alt=''
                  aria-hidden
                  width={400}
                  height={400}
                  unoptimized
                  className='theme-dark-only h-auto w-full select-none'
                  draggable={false}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <span className='text-ink-faint text-xs'>{t(locale, 'counter.tapHint')}</span>
          <motion.span className='font-display text-[clamp(96px,32vw,150px)] leading-[0.85] tracking-tight'>{displayed}</motion.span>
          <span className='font-display text-ink-soft -mt-1 text-base italic'>
            {display === 1 ? t(locale, 'counter.airplane') : t(locale, 'counter.airplanes')} {myName.toLowerCase()}
          </span>
        </button>

        <footer className='relative z-10 mt-4 flex items-end justify-between gap-4'>
          <div className='flex flex-col gap-0.5'>
            <span className='text-ink-faint text-xs'>{partnerName}</span>
            <span className='font-display text-ink-soft text-xl'>{tt[partner]}</span>
          </div>
          <button
            type='button'
            onClick={undo}
            disabled={!canUndo}
            aria-label={t(locale, 'counter.undoAriaLabel')}
            className='group text-ink-soft hover:bg-line/40 hover:text-ink focus-visible:bg-line/40 focus-visible:text-ink -mr-3 inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm transition-colors active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:focus-visible:bg-transparent'
          >
            <span
              aria-hidden
              className='text-base leading-none transition-transform duration-300 group-hover:-rotate-[20deg] group-focus-visible:-rotate-[20deg]'
            >
              ↶
            </span>
            <span>{t(locale, 'counter.undo')}</span>
          </button>
        </footer>
      </main>
    </AppShell>
  )
}
