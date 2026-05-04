'use client'

import { motion, useMotionValue, useReducedMotion, type PanInfo } from 'motion/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { t, type TKey } from '../lib/i18n'
import { useNavDirection } from '../lib/nav-direction'
import { selectLocale, useOfflineState } from '../lib/offline-store'
import { IDENTITIES, type Identity } from '../lib/types'

const links: { href: string; labelKey: TKey }[] = [
  { href: '/', labelKey: 'nav.count' },
  { href: '/diary', labelKey: 'nav.diary' },
  { href: '/scoreboard', labelKey: 'nav.scoreboard' },
  { href: '/settings', labelKey: 'nav.settings' }
]

export function Nav({ who }: { who: Identity }) {
  const pathname = usePathname()
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const { set: setDirection } = useNavDirection()
  const accent = IDENTITIES[who]
  const state = useOfflineState()
  const locale = selectLocale(state)

  const currentIndex = links.findIndex((l) => l.href === pathname)
  const [scrubbing, setScrubbing] = useState(false)
  const [scrubIndex, setScrubIndex] = useState(currentIndex)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const navRef = useRef<HTMLElement>(null)

  const indicatorX = useMotionValue(0)

  const getIndexFromPointer = (pointX: number) => {
    if (!navRef.current) return currentIndex
    const rect = navRef.current.getBoundingClientRect()
    const relX = pointX - rect.left
    const tabWidth = rect.width / links.length
    return Math.max(0, Math.min(links.length - 1, Math.floor(relX / tabWidth)))
  }

  const updateIndicator = (pointX: number) => {
    if (!navRef.current) return
    const rect = navRef.current.getBoundingClientRect()
    const relX = pointX - rect.left
    const clamped = Math.max(16, Math.min(rect.width - 16, relX))
    indicatorX.set(clamped - 16)
  }

  const onDragStart = (_: unknown, info: PanInfo) => {
    setScrubbing(true)
    setScrubIndex(currentIndex)
    updateIndicator(info.point.x)
  }

  const onDrag = (_: unknown, info: PanInfo) => {
    updateIndicator(info.point.x)
    const idx = getIndexFromPointer(info.point.x)
    if (idx !== scrubIndex) setScrubIndex(idx)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    setScrubbing(false)
    const targetIndex = getIndexFromPointer(info.point.x)
    if (targetIndex !== currentIndex) {
      setDirection(targetIndex > currentIndex ? 1 : -1)
      router.push(links[targetIndex].href)
    }
  }

  const activeIdx = scrubbing ? scrubIndex : currentIndex

  return (
    <nav
      ref={navRef}
      className='relative flex items-stretch'
    >
      {links.map((l, i) => {
        const active = i === activeIdx
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={(e) => {
              if (i !== currentIndex) {
                setDirection(i > currentIndex ? 1 : -1)
              }
              if (scrubbing) e.preventDefault()
            }}
            aria-current={i === currentIndex ? 'page' : undefined}
            className='group relative flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1.5 py-2 select-none'
          >
            <span
              className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                active ? accent.bg
                : hoverIndex === i ? 'bg-ink-faint/70 scale-125'
                : 'bg-ink-faint/30 group-focus-visible:bg-ink-faint/70 group-focus-visible:scale-125'
              }`}
              aria-hidden
            />
            <span
              className={`font-display text-base leading-none transition-colors duration-200 ${
                active || hoverIndex === i ? 'text-ink' : 'text-ink-soft group-focus-visible:text-ink'
              }`}
            >
              {t(locale, l.labelKey)}
            </span>
          </Link>
        )
      })}

      {!scrubbing && (
        <motion.span
          layoutId='nav-active'
          aria-hidden
          className={`absolute bottom-1.5 h-[2px] w-8 rounded-full ${accent.bg}`}
          style={{
            left: `calc(${activeIdx} * 25% + 12.5% - 16px)`
          }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}

      {scrubbing && (
        <motion.span
          aria-hidden
          className={`absolute bottom-1.5 h-[2px] w-8 rounded-full ${accent.bg}`}
          style={{ x: indicatorX, left: 0 }}
        />
      )}

      <motion.div
        className='absolute inset-0 z-10 touch-none cursor-pointer active:cursor-grabbing'
        drag='x'
        dragElastic={0}
        dragConstraints={{ left: 0, right: 0 }}
        dragMomentum={false}
        onDragStart={onDragStart}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        onHoverStart={(e) => {
          const idx = getIndexFromPointer((e as PointerEvent).clientX)
          setHoverIndex(idx)
        }}
        onHoverEnd={() => setHoverIndex(null)}
        onPointerMove={(e) => {
          const idx = getIndexFromPointer(e.clientX)
          setHoverIndex(idx)
        }}
        onTap={(e) => {
          if (!navRef.current) return
          const rect = navRef.current.getBoundingClientRect()
          const x = (e as PointerEvent).clientX - rect.left
          const tabWidth = rect.width / links.length
          const tappedIndex = Math.min(links.length - 1, Math.max(0, Math.floor(x / tabWidth)))
          if (tappedIndex !== currentIndex) {
            setDirection(tappedIndex > currentIndex ? 1 : -1)
            router.push(links[tappedIndex].href)
          }
        }}
        style={{ x: 0 }}
      />
    </nav>
  )
}
