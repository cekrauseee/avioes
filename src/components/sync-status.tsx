'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useOnline, useQueue } from '../lib/offline-queue'

const EASE = [0.22, 1, 0.36, 1] as const

export function SyncStatus() {
  const queue = useQueue()
  const online = useOnline()
  const reducedMotion = useReducedMotion()
  const pending = queue.length
  const visible = !online

  const prefix = 'offline'
  const showCount = !online && pending > 0
  const countNumber = showCount ? pending : null
  const countWord = showCount ? (pending === 1 ? 'pendente' : 'pendentes') : null

  const tokenEnter = reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
  const tokenExit = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -2 }
  const tokenInitial = reducedMotion ? { opacity: 0 } : { opacity: 0, y: 2 }
  const tokenTransition = { duration: 0.15, ease: EASE }

  return (
    <span
      className='text-ink-faint inline-flex items-center gap-1.5 text-xs'
      role='status'
      aria-live='polite'
    >
      {visible && (
        <span
          aria-hidden
          className='bg-sky h-1.5 w-1.5 shrink-0 rounded-full'
        />
      )}
      <span className='inline-flex items-baseline whitespace-nowrap'>
        <AnimatePresence
          mode='wait'
          initial={false}
        >
          {visible && (
            <motion.span
              key={prefix}
              initial={tokenInitial}
              animate={tokenEnter}
              exit={tokenExit}
              transition={tokenTransition}
              className='inline-block'
            >
              {prefix}
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {countNumber !== null && (
            <motion.span
              key='count-segment'
              initial={tokenInitial}
              animate={tokenEnter}
              exit={tokenExit}
              transition={tokenTransition}
              className='inline-block'
            >
              {' · '}
              <AnimatePresence
                mode='wait'
                initial={false}
              >
                <motion.span
                  key={countNumber}
                  initial={tokenInitial}
                  animate={tokenEnter}
                  exit={tokenExit}
                  transition={tokenTransition}
                  className='inline-block'
                >
                  {countNumber}
                </motion.span>
              </AnimatePresence>
              {countWord && (
                <>
                  {' '}
                  <AnimatePresence
                    mode='wait'
                    initial={false}
                  >
                    <motion.span
                      key={countWord}
                      initial={tokenInitial}
                      animate={tokenEnter}
                      exit={tokenExit}
                      transition={tokenTransition}
                      className='inline-block'
                    >
                      {countWord}
                    </motion.span>
                  </AnimatePresence>
                </>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </span>
  )
}
