'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { MOTION_OFFSET, MOTION_TRANSITION } from '@/lib/motion'
import { useNavDirection } from '@/lib/nav-direction'

let routeAnimationReady = false

export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  const { get } = useNavDirection()
  const direction = get()
  const [animateInitial] = useState(routeAnimationReady)

  useEffect(() => {
    routeAnimationReady = true
  }, [])

  return (
    <motion.div
      initial={animateInitial && !reduceMotion ? { opacity: 0.92, x: direction * MOTION_OFFSET.route } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={MOTION_TRANSITION.route}
      className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'
    >
      {children}
    </motion.div>
  )
}
