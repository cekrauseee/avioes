'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useNavDirection } from '../lib/nav-direction'

export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  const { get } = useNavDirection()
  const direction = get()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: direction * 24, filter: 'blur(4px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'
    >
      {children}
    </motion.div>
  )
}
