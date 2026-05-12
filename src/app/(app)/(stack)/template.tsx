'use client'

import { MOTION_OFFSET, MOTION_TRANSITION } from '@/lib/motion'
import { motion, useReducedMotion } from 'motion/react'

export default function StackTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: MOTION_OFFSET.screen }}
      animate={{ opacity: 1, y: 0 }}
      transition={MOTION_TRANSITION.screen}
      className='flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-lg'
    >
      {children}
    </motion.div>
  )
}
