'use client'

import { MOTION_TRANSITION } from '@/lib/motion'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

let ready = false

export default function TabsTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()
  const [animate] = useState(ready)

  useEffect(() => {
    ready = true
  }, [])

  return (
    <motion.div
      initial={animate && !reduce ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={MOTION_TRANSITION.route}
      className='flex min-h-0 flex-1 flex-col'
    >
      {children}
    </motion.div>
  )
}
