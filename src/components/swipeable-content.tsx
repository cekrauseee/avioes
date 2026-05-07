'use client'

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react'
import { usePathname, useRouter, useSelectedLayoutSegments } from 'next/navigation'
import { useArrowKeyNavigation, useHorizontalWheelNavigation } from '../lib/horizontal-wheel-navigation'
import { useNavDirection } from '../lib/nav-direction'

const ROUTES = ['/', '/diary', '/scoreboard', '/settings']
const SWIPE_THRESHOLD = 60
const WHEEL_SWIPE_THRESHOLD = 34
const pageTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }
const pageExitTransition = { duration: 0.12, ease: 'easeIn' as const }

function topLevelRouteKey(segments: string[]) {
  const segment = segments.find((value) => !value.startsWith('(') && !value.startsWith('@'))
  return segment ? `/${segment}` : '/'
}

export function SwipeableContent({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const segments = useSelectedLayoutSegments()
  const { set, get } = useNavDirection()
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
  const onWheel = useHorizontalWheelNavigation(navigate, WHEEL_SWIPE_THRESHOLD)
  useArrowKeyNavigation(navigate, currentIndex !== -1 && !disabled)

  if (reduce) return <>{children}</>

  const isTopLevelRoute = currentIndex !== -1
  const gesturesEnabled = isTopLevelRoute && !disabled
  const direction = get()
  const routeKey = topLevelRouteKey(segments)

  if (!isTopLevelRoute) return <>{children}</>

  const page = (
    <AnimatePresence
      mode='wait'
      initial={false}
      custom={direction}
    >
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, x: direction * 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, transition: pageExitTransition }}
        transition={pageTransition}
        className='absolute inset-0 flex flex-col overflow-hidden'
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )

  if (!gesturesEnabled) return <div className='relative isolate flex min-h-0 flex-1 flex-col overflow-hidden'>{page}</div>

  return (
    <motion.div
      className='relative isolate flex min-h-0 flex-1 touch-pan-y flex-col overflow-hidden overscroll-x-contain'
      drag='x'
      dragDirectionLock
      dragElastic={0.15}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={onDragEnd}
      onWheelCapture={onWheel}
      whileDrag={{ cursor: 'grabbing' }}
    >
      {page}
    </motion.div>
  )
}
