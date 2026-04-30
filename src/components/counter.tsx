'use client'

import { motion, useSpring, useTransform } from 'motion/react'
import { startTransition, useEffect, useOptimistic, useState } from 'react'
import { addAirplane, clearIdentity, undoLast } from '../actions'
import { IDENTITIES, type Identity, type Theme } from '../lib/types'
import { PlaneArc, type ArcKey } from './plane-arc'
import { ThemeToggle } from './theme-toggle'

type Props = {
  who: Identity
  myCount: number
  partnerCount: number
  total: number
  canUndo: boolean
  theme: Theme
}

export function Counter({ who, myCount, partnerCount, total, canUndo, theme }: Props) {
  const me = IDENTITIES[who]
  const partner = who === 'henrique' ? 'pietra' : 'henrique'
  const partnerName = IDENTITIES[partner].label
  const myName = me.label

  const [optimistic, applyDelta] = useOptimistic(myCount, (state: number, delta: number) => Math.max(0, state + delta))
  const [optTotal, applyTotalDelta] = useOptimistic(total, (state: number, delta: number) => Math.max(0, state + delta))
  const [flights, setFlights] = useState<ArcKey[]>([])

  const spring = useSpring(optimistic, { stiffness: 220, damping: 22 })
  useEffect(() => {
    spring.set(optimistic)
  }, [optimistic, spring])
  const display = useTransform(spring, (v) => Math.round(v).toString())

  const tap = () => {
    setFlights((f) => [...f.slice(-2), { id: Date.now(), from: Math.random() > 0.5 ? 'left' : 'right' }])
    startTransition(async () => {
      applyDelta(1)
      applyTotalDelta(1)
      await addAirplane()
    })
  }

  const undo = () => {
    startTransition(async () => {
      applyDelta(-1)
      applyTotalDelta(-1)
      await undoLast()
    })
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
          <span className='text-ink-faint text-xs'>{optTotal} no total</span>
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
        <motion.span className='font-display text-[clamp(96px,32vw,150px)] leading-[0.85] tracking-tight'>{display}</motion.span>
        <span className='font-display text-ink-soft -mt-1 text-base italic'>
          {optimistic === 1 ? 'avião' : 'aviões'} {myName.toLowerCase()}
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
