'use client'

import { motion, useReducedMotion, type PanInfo } from 'motion/react'
import { usePathname, useRouter } from 'next/navigation'
import { useNavDirection } from '../lib/nav-direction'

const ROUTES = ['/', '/diary', '/scoreboard', '/settings']
const SWIPE_THRESHOLD = 60

export function SwipeableContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { set } = useNavDirection()
  const reduce = useReducedMotion()

  const currentIndex = ROUTES.indexOf(pathname)

  const navigate = (direction: 1 | -1) => {
    const next = currentIndex + direction
    if (next < 0 || next >= ROUTES.length) return
    set(direction)
    router.push(ROUTES[next])
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && info.velocity.x < 0) navigate(1)
    else if (info.offset.x > SWIPE_THRESHOLD && info.velocity.x > 0) navigate(-1)
  }

  if (currentIndex === -1 || reduce) return <>{children}</>

  return (
    <motion.div
      className='flex min-h-0 flex-1 touch-pan-y flex-col'
      drag='x'
      dragElastic={0.15}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={onDragEnd}
      style={{ cursor: 'grab' }}
      whileDrag={{ cursor: 'grabbing' }}
    >
      {children}
    </motion.div>
  )
}
