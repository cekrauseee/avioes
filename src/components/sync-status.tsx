'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useSyncExternalStore } from 'react'
import { t } from '../lib/i18n'
import { MOTION_OFFSET, MOTION_TRANSITION } from '../lib/motion'
import { isOffline, selectLocale, selectPendingCount, useOfflineState } from '../lib/offline-store'

const subscribe = () => () => {}
const getTrue = () => true
const getFalse = () => false

export function SyncStatus() {
  const mounted = useSyncExternalStore(subscribe, getTrue, getFalse)
  const state = useOfflineState()
  const locale = selectLocale(state)
  const offline = mounted && isOffline(state)
  const reducedMotion = useReducedMotion()
  const pending = selectPendingCount(state)

  const visible = offline
  const showCount = offline && pending > 0

  const label = offline ? t(locale, 'sync.offline') : null
  const countNumber = showCount ? pending : null
  const countWord =
    showCount ?
      pending === 1 ?
        t(locale, 'sync.pendingSingular')
      : t(locale, 'sync.pendingPlural')
    : null

  const tokenEnter = reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
  const tokenExit = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -MOTION_OFFSET.token }
  const tokenInitial = reducedMotion ? { opacity: 0 } : { opacity: 0, y: MOTION_OFFSET.token }

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
          {label && (
            <motion.span
              key={label}
              initial={tokenInitial}
              animate={tokenEnter}
              exit={tokenExit}
              transition={MOTION_TRANSITION.token}
              className='inline-block'
            >
              {label}
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
              transition={MOTION_TRANSITION.token}
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
                  transition={MOTION_TRANSITION.token}
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
                      transition={MOTION_TRANSITION.token}
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
