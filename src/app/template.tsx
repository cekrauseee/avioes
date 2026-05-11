'use client'

import { MOTION_TRANSITION } from '@/lib/motion'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

let routeAnimationReady = false

export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  const [animateInitial] = useState(routeAnimationReady)

  useEffect(() => {
    routeAnimationReady = true
  }, [])

  return (
    <motion.div
      initial={animateInitial && !reduceMotion ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={MOTION_TRANSITION.route}
      className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'
    >
      {children}
    </motion.div>
  )
}
