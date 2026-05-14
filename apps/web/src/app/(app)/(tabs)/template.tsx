'use client'

import { MOTION_TRANSITION } from '@/lib/motion'
import { motion, useReducedMotion } from 'motion/react'

export default function TabsTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={MOTION_TRANSITION.route}
      className='flex min-h-0 flex-1 flex-col'
    >
      {children}
    </motion.div>
  )
}
