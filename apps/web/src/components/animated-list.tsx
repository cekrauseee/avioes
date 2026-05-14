'use client'

import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { forwardRef, type ReactNode } from 'react'
import { MOTION_TRANSITION, withMotionDelay } from '../lib/motion'

export function AnimatedListGroup({ children }: { children: ReactNode }) {
  return <LayoutGroup>{children}</LayoutGroup>
}

export function AnimatedLayoutBlock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      layout='position'
      transition={{ layout: MOTION_TRANSITION.listLayout }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedList({
  children,
  className,
  mode = 'popLayout'
}: {
  children: ReactNode
  className?: string
  mode?: 'sync' | 'popLayout' | 'wait'
}) {
  return (
    <AnimatedLayoutBlock className={className}>
      <AnimatePresence
        initial={false}
        mode={mode}
      >
        {children}
      </AnimatePresence>
    </AnimatedLayoutBlock>
  )
}

export const AnimatedListItem = forwardRef<HTMLDivElement, { children: ReactNode; className?: string; enterDelay?: number }>(function AnimatedListItem(
  { children, className, enterDelay = 0 },
  ref
) {
  return (
    <motion.div
      ref={ref}
      layout='position'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: withMotionDelay(MOTION_TRANSITION.listEnter, enterDelay) }}
      exit={{ opacity: 0, transition: MOTION_TRANSITION.fastFade }}
      transition={{ layout: MOTION_TRANSITION.listLayout }}
      className={className}
    >
      {children}
    </motion.div>
  )
})
