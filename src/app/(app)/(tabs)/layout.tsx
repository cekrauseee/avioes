'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { usePathname } from 'next/navigation'
import { NavBar } from '@/components/nav-bar'
import { SwipeableContent } from '@/components/swipeable-content'
import { MOTION_OFFSET, MOTION_TRANSITION } from '@/lib/motion'
import { useNavDirection } from '@/lib/nav-direction'
import { useOfflineState } from '@/lib/offline-store'

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const state = useOfflineState()
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const { get } = useNavDirection()
  const direction = get()

  return (
    <>
      <SwipeableContent>
        <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
          <AnimatePresence
            mode='sync'
            initial={false}
          >
            <motion.div
              key={pathname}
              initial={reduce ? false : { opacity: 0, x: direction * MOTION_OFFSET.route }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -direction * MOTION_OFFSET.route }}
              transition={MOTION_TRANSITION.route}
              className='absolute inset-0 flex flex-col'
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </SwipeableContent>
      <NavBar who={state.identity!} />
    </>
  )
}
