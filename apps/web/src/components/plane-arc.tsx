'use client'

import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { MOTION_TRANSITION } from '../lib/motion'

export type ArcKey = {
  id: number
  from: 'left' | 'right'
  entryY: number
  exitY: number
  pitch: number
}

export function PlaneArc({ flights, onFlightDone }: { flights: ArcKey[]; onFlightDone: (id: number) => void }) {
  return (
    <div
      aria-hidden
      className='[container-type:size] pointer-events-none absolute inset-0 overflow-hidden'
    >
      <AnimatePresence>
        {flights.map((f) => {
          const fromRight = f.from === 'right'
          const scaleX = fromRight ? -1 : 1
          return (
            <motion.div
              key={f.id}
              initial={{
                x: fromRight ? '108cqw' : '-8cqw',
                y: `${f.entryY}cqh`,
                rotate: f.pitch,
                scaleX,
                opacity: 0.7
              }}
              animate={{
                x: fromRight ? '-8cqw' : '108cqw',
                y: `${f.exitY}cqh`,
                rotate: f.pitch,
                scaleX,
                opacity: [0.7, 0.7, 0.7, 0]
              }}
              transition={{
                ...MOTION_TRANSITION.planeArc,
                opacity: { times: [0, 0.85, 0.92, 1], duration: MOTION_TRANSITION.planeArc.duration }
              }}
              onAnimationComplete={() => onFlightDone(f.id)}
              className='absolute h-9 w-9'
            >
              <Image
                src='/flying-airplane-light.png'
                alt=''
                aria-hidden
                width={64}
                height={64}
                unoptimized
                className='theme-light-only h-full w-full select-none'
                draggable={false}
              />
              <Image
                src='/flying-airplane-dark.png'
                alt=''
                aria-hidden
                width={64}
                height={64}
                unoptimized
                className='theme-dark-only h-full w-full select-none'
                draggable={false}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
