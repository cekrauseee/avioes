'use client'

import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { t } from '../lib/i18n'
import { addAirplane, isOffline, selectEvents, selectLocale, selectOfflineSyncing, undoAirplane, useOfflineState } from '../lib/offline-store'
import { totals } from '../lib/streaks'
import { getMemberColor, getMemberFirstName } from '../lib/types'
import { AccountSheet } from './account-sheet'
import { AppShell } from './app-shell'
import { Onboarding } from './onboarding'
import { PlaneArc, type ArcKey } from './plane-arc'
import { SyncStatus } from './sync-status'
import { ThemeToggle } from './theme-toggle'

export function Counter() {
  const state = useOfflineState()
  const who = state.identity
  const hasGroup = !!state.activeGroupId

  if (!who || !hasGroup) return <Onboarding />

  return (
    <CounterContent
      state={state}
      who={who}
    />
  )
}

function CounterContent({ state, who }: { state: ReturnType<typeof useOfflineState>; who: NonNullable<ReturnType<typeof useOfflineState>['identity']> }) {
  const me = getMemberColor(who, state.groupMembers)
  const myName = getMemberFirstName(who, state.groupMembers)
  const locale = selectLocale(state)

  const events = selectEvents(state)
  const tt = totals(events)
  const offline = isOffline(state)
  const offlineSyncing = selectOfflineSyncing(state)
  const syncVisible = offline
  const reducedMotion = useReducedMotion()
  const tokenInitial = reducedMotion ? { opacity: 0 } : { opacity: 0, y: 2 }
  const tokenEnter = reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
  const tokenExit = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -2 }
  const tokenTransition = { duration: 0.15, ease: [0.22, 1, 0.36, 1] as const }

  const display = tt[who] ?? 0
  const othersTotal = Object.entries(tt)
    .filter(([id]) => id !== who)
    .reduce((sum, [, n]) => sum + n, 0)
  const totalDisplay = Object.values(tt).reduce((sum, n) => sum + n, 0)
  const canUndo = display > 0

  const [accountOpen, setAccountOpen] = useState(false)
  const [flights, setFlights] = useState<ArcKey[]>([])
  const flightIdRef = useRef(0)
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

  useEffect(() => {
    for (const src of ['/flying-airplane-light.png', '/flying-airplane-dark.png']) {
      const img = new window.Image()
      img.src = src
    }
  }, [])

  const hydrated = state.hydrated

  const tap = () => {
    flightIdRef.current += 1
    const from: ArcKey['from'] = Math.random() > 0.5 ? 'left' : 'right'
    const entryY = 15 + Math.random() * 55
    const exitY = 15 + Math.random() * 55
    const pitch = (Math.atan2(exitY - entryY, 125) * 180) / Math.PI
    setFlights((f) => [...f, { id: flightIdRef.current, from, entryY, exitY, pitch }])
    animateNextRef.current = true
    addAirplane(who)
  }

  const handleFlightDone = (id: number) => {
    setFlights((f) => f.filter((x) => x.id !== id))
  }

  const undo = () => {
    if (!canUndo) return
    animateNextRef.current = true
    undoAirplane(who)
  }

  // Show other members for the footer
  const otherMembers = state.groupMembers.filter((m) => m.userId !== who)
  const partnerLabel =
    otherMembers.length === 1 ? getMemberFirstName(otherMembers[0].userId, state.groupMembers)
    : otherMembers.length > 1 ? t(locale, 'counter.others')
    : ''

  return (
    <AppShell>
      <main className='relative flex min-h-0 w-full flex-1 flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
        <PlaneArc
          flights={flights}
          onFlightDone={handleFlightDone}
        />

        <header className='relative z-10 flex items-center justify-between'>
          <button
            type='button'
            onClick={() => setAccountOpen(true)}
            className='group hover:bg-line/40 -ml-3 inline-flex min-h-11 items-center gap-2.5 rounded-full px-3 transition-colors active:scale-[0.97]'
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${me.bg} transition-transform group-hover:scale-125`}
              aria-hidden
            />
            <span className='font-display text-sm'>{myName}</span>
            <span className='text-ink-faint inline-flex min-h-3 min-w-3 items-center text-xs'>
              {offline ?
                t(locale, 'counter.offline')
              : offlineSyncing && (
                  <span
                    role='status'
                    aria-label={t(locale, 'sync.syncing')}
                    className={`h-3 w-3 shrink-0 rounded-full border-[1.5px] border-current border-r-transparent ${me.text} ${reducedMotion ? '' : 'animate-spin'}`}
                  />
                )
              }
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
            {display === 0 && othersTotal === 0 && (
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
          {partnerLabel ?
            <div className='flex flex-col gap-0.5'>
              <span className='text-ink-faint text-xs'>{partnerLabel}</span>
              <span className='font-display text-ink-soft text-xl'>{othersTotal}</span>
            </div>
          : <div />}
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
      <AccountSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
      />
    </AppShell>
  )
}
