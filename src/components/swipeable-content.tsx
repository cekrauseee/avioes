'use client'

import { motion, useReducedMotion, type PanInfo } from 'motion/react'
import { usePathname, useRouter } from 'next/navigation'
import { useArrowKeyNavigation } from '../lib/horizontal-wheel-navigation'
import { useNavDirection } from '../lib/nav-direction'
import { useRouteGestureLock } from '../lib/route-gesture-lock'

const ROUTES = ['/', '/diary', '/scoreboard', '/settings', '/world']
const SWIPE_THRESHOLD = 60

export function SwipeableContent({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const { set } = useNavDirection()
  const reduce = useReducedMotion()
  const routeGestureLocked = useRouteGestureLock()

  const currentIndex = ROUTES.indexOf(pathname)
  const gesturesEnabled = currentIndex !== -1 && !reduce && !disabled && !routeGestureLocked

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
  useArrowKeyNavigation(navigate, gesturesEnabled)

  if (currentIndex === -1 || reduce || disabled) return <>{children}</>

  return (
    <motion.div
      className='flex min-h-0 flex-1 touch-pan-y flex-col overscroll-x-contain'
      drag={routeGestureLocked ? false : 'x'}
      dragDirectionLock
      dragElastic={0.15}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={routeGestureLocked ? undefined : onDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
    >
      {children}
    </motion.div>
  )
}
