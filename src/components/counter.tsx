'use client'

import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { clearIdentity, syncEvents } from '../actions'
import { deltaFor, dropOps, enqueueAdd, enqueueUndo, readQueue, totalDelta, useOnline, useQueue } from '../lib/offline-queue'
import { IDENTITIES, type Identity, type Theme } from '../lib/types'
import { PlaneArc, type ArcKey } from './plane-arc'
import { SyncStatus } from './sync-status'
import { ThemeToggle } from './theme-toggle'

type Props = {
  who: Identity
  myCount: number
  partnerCount: number
  total: number
  theme: Theme
}

export function Counter({ who, myCount, partnerCount, total, theme }: Props) {
  const me = IDENTITIES[who]
  const partner = who === 'henrique' ? 'pietra' : 'henrique'
  const partnerName = IDENTITIES[partner].label
  const myName = me.label

  const queue = useQueue()
  const online = useOnline()
  const myDelta = deltaFor(queue, who)
  const syncVisible = !online
  const reducedMotion = useReducedMotion()
  const tokenInitial = reducedMotion ? { opacity: 0 } : { opacity: 0, y: 2 }
  const tokenEnter = reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
  const tokenExit = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -2 }
  const tokenTransition = { duration: 0.15, ease: [0.22, 1, 0.36, 1] as const }

  const [override, setOverride] = useState<{ my: number; total: number } | null>(null)
  if (override !== null && myCount === override.my && total === override.total) {
    setOverride(null)
  }
  const baseMy = override?.my ?? myCount
  const baseTotal = override?.total ?? total

  const display = Math.max(0, baseMy + myDelta)
  const totalDisplay = Math.max(0, baseTotal + totalDelta(queue))
  const canUndo = display > 0

  const [flights, setFlights] = useState<ArcKey[]>([])
  const spring = useSpring(display, { stiffness: 220, damping: 22 })
  useEffect(() => {
    spring.set(display)
  }, [display, spring])
  const displayed = useTransform(spring, (v) => Math.round(v).toString())

  const syncing = useRef(false)
  const sync = useCallback(async () => {
    if (syncing.current) return
    const snapshot = readQueue()
    if (snapshot.length === 0) return
    syncing.current = true
    try {
      const result = await syncEvents([...snapshot])
      if (result.acked.length > 0) {
        flushSync(() => {
          setOverride({ my: result.my, total: result.total })
        })
        dropOps(result.acked)
      }
    } catch {
      // network or server failed — keep queue, retry later
    } finally {
      syncing.current = false
    }
  }, [])

  useEffect(() => {
    void sync()
  }, [sync, queue])

  useEffect(() => {
    const onOnline = () => void sync()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sync])

  const tap = () => {
    setFlights((f) => [...f.slice(-2), { id: Date.now(), from: Math.random() > 0.5 ? 'left' : 'right' }])
    enqueueAdd(who)
  }

  const undo = () => {
    if (!canUndo) return
    enqueueUndo(who)
  }

  return (
    <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
      <PlaneArc flights={flights} />

      <header className='relative z-10 flex items-center justify-between'>
        <button
          type='button'
          onClick={() => startTransition(() => clearIdentity())}
          className='group hover:bg-line/40 focus-visible:bg-line/40 -ml-2 inline-flex items-center gap-2 rounded-full px-2 py-1 transition-colors'
        >
          <span
            className={`h-2 w-2 rounded-full ${me.bg} transition-transform group-hover:scale-125 group-focus-visible:scale-125`}
            aria-hidden
          />
          <span className='font-display text-sm'>{myName}</span>
          <span className='text-ink-faint group-hover:text-ink-soft group-focus-visible:text-ink-soft text-xs transition-colors'>trocar</span>
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
            <span>no total</span>
          </span>
          <ThemeToggle theme={theme} />
        </div>
      </header>

      <button
        type='button'
        onClick={tap}
        className='relative z-10 mt-4 flex flex-1 flex-col items-end justify-center text-right transition-transform select-none active:scale-[0.99]'
        aria-label='Vi um avião'
      >
        <span className='text-ink-faint text-xs'>toque · vi um avião</span>
        <motion.span className='font-display text-[clamp(96px,32vw,150px)] leading-[0.85] tracking-tight'>{displayed}</motion.span>
        <span className='font-display text-ink-soft -mt-1 text-base italic'>
          {display === 1 ? 'avião' : 'aviões'} {myName.toLowerCase()}
        </span>
      </button>

      <footer className='relative z-10 mt-4 flex items-end justify-between gap-4'>
        <div className='flex flex-col gap-0.5'>
          <span className='text-ink-faint text-xs'>{partnerName}</span>
          <span className='font-display text-ink-soft text-xl'>{partnerCount}</span>
        </div>
        <button
          type='button'
          onClick={undo}
          disabled={!canUndo}
          aria-label='desfazer último avião'
          className='group text-ink-soft hover:bg-line/40 hover:text-ink focus-visible:bg-line/40 focus-visible:text-ink -mr-3 inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm transition-colors active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:focus-visible:bg-transparent'
        >
          <span
            aria-hidden
            className='text-base leading-none transition-transform duration-300 group-hover:-rotate-[20deg] group-focus-visible:-rotate-[20deg]'
          >
            ↶
          </span>
          <span>desfazer</span>
        </button>
      </footer>
    </main>
  )
}
