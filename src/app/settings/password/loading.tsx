'use client'

import { Skel } from '@/components/skeleton'
import { MOTION_TRANSITION, withMotionDelay } from '@/lib/motion'
import { motion } from 'motion/react'

export default function Loading() {
  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)]'>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={MOTION_TRANSITION.header}
        className='flex items-center justify-between gap-3'
      >
        <Skel className='h-4 w-14' />
        <Skel className='h-11 w-24 rounded-full' />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withMotionDelay(MOTION_TRANSITION.section, 0.08)}
        className='mt-12 flex flex-col gap-10'
      >
        <div className='flex flex-col gap-3'>
          <Skel className='h-10 w-48' />
          <Skel className='h-10 w-36' />
          <Skel className='mt-1 h-4 w-56' />
        </div>
        <Skel className='h-12 w-full rounded-xl' />
      </motion.div>
    </div>
  )
}
