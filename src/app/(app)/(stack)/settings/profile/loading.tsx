'use client'

import { Skel } from '@/components/skeleton'
import { MOTION_TRANSITION, withMotionDelay } from '@/lib/motion'
import { motion } from 'motion/react'

export default function Loading() {
  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={MOTION_TRANSITION.header}
        className='flex items-center justify-between gap-3'
      >
        <Skel className='h-4 w-14' />
        <span
          aria-hidden
          className='bg-line/60 block h-11 w-24 animate-pulse rounded-full'
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withMotionDelay(MOTION_TRANSITION.section, 0.06)}
        className='mt-10 flex shrink-0 flex-col gap-3'
      >
        <Skel className='h-9 w-24' />
        <Skel className='h-9 w-32' />
        <Skel className='mt-1 h-4 w-64' />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withMotionDelay(MOTION_TRANSITION.section, 0.14)}
        className='scroll-area -mx-1 mt-8 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 pb-2'
      >
        <div className='flex items-center gap-4'>
          <span
            aria-hidden
            className='bg-line/60 block h-[72px] w-[72px] animate-pulse rounded-full'
          />
          <div className='flex flex-col gap-2'>
            <span
              aria-hidden
              className='bg-line/60 block h-10 w-36 animate-pulse rounded-full'
            />
            <span
              aria-hidden
              className='bg-line/60 block h-10 w-36 animate-pulse rounded-full'
            />
          </div>
        </div>

        <FieldRowSkeleton labelClass='w-24' />
        <FieldRowSkeleton labelClass='w-16' />
        <FieldRowSkeleton
          labelClass='w-32'
          hint
        />

        <div className='grid grid-cols-2 gap-3'>
          <FieldRowSkeleton labelClass='w-10' />
          <FieldRowSkeleton labelClass='w-12' />
        </div>

        <Skel className='mt-2 h-12 w-full rounded-xl' />
      </motion.div>
    </div>
  )
}

function FieldRowSkeleton({ labelClass, hint }: { labelClass: string; hint?: boolean }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <Skel className={`h-3 ${labelClass}`} />
      <Skel className='h-12 w-full rounded-xl' />
      {hint && <Skel className='mt-0.5 h-2.5 w-44' />}
    </div>
  )
}
