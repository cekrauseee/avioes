'use client'

import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { forwardRef, type ReactNode } from 'react'

const EASE = [0.22, 1, 0.36, 1] as const
const LAYOUT_TRANSITION = { duration: 0.18, ease: EASE }

export function AnimatedListGroup({ children }: { children: ReactNode }) {
  return <LayoutGroup>{children}</LayoutGroup>
}

export function AnimatedLayoutBlock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      layout='position'
      transition={{ layout: LAYOUT_TRANSITION }}
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
      animate={{ opacity: 1, transition: { duration: 0.14, delay: enterDelay, ease: EASE } }}
      exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE } }}
      transition={{ layout: LAYOUT_TRANSITION }}
      className={className}
    >
      {children}
    </motion.div>
  )
})
