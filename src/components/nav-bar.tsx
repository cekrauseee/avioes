'use client'

import { motion, useReducedMotion } from 'motion/react'
import { MOTION_TRANSITION } from '../lib/motion'
import type { Identity } from '../lib/types'
import { Nav } from './nav'

export function NavBar({ who }: { who: Identity }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={MOTION_TRANSITION.navIndicator}
      className='relative pb-[max(env(safe-area-inset-bottom),0.4rem)]'
    >
      <div className='mx-auto w-full max-w-[420px]'>
        <Nav who={who} />
      </div>
    </motion.div>
  )
}
