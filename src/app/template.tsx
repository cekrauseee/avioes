'use client'

import { motion, useReducedMotion } from 'motion/react'
import { MOTION_OFFSET, MOTION_TRANSITION } from '../lib/motion'
import { useNavDirection } from '../lib/nav-direction'

export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  const { get } = useNavDirection()
  const direction = get()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: direction * MOTION_OFFSET.route, filter: 'blur(4px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={MOTION_TRANSITION.route}
      className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'
    >
      {children}
    </motion.div>
  )
}
