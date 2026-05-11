'use client'

import { motion, useMotionValue, useReducedMotion, type PanInfo } from 'motion/react'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { t, type TKey } from '../lib/i18n'
import { MOTION_SPRING } from '../lib/motion'
import type { Locale } from '../lib/types'

export type ToolbarTabItem<Id extends string> = {
  id: Id
  href?: string
  labelKey: TKey
}

export function ToolbarTabs<Id extends string>({
  items,
  activeId,
  accentClass,
  locale,
  indicatorLayoutId,
  onSelect
}: {
  items: ToolbarTabItem<Id>[]
  activeId: Id
  accentClass: string
  locale: Locale
  indicatorLayoutId: string
  onSelect: (id: Id) => void
}) {
  const reduceMotion = useReducedMotion()
  const currentIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId)
  )
  const [scrubbing, setScrubbing] = useState(false)
  const [scrubIndex, setScrubIndex] = useState(currentIndex)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const indicatorX = useMotionValue(0)

  const getIndexFromPointer = (pointX: number) => {
    if (!navRef.current) return currentIndex
    const rect = navRef.current.getBoundingClientRect()
    const relX = pointX - rect.left
    const tabWidth = rect.width / items.length
    return Math.max(0, Math.min(items.length - 1, Math.floor(relX / tabWidth)))
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
    if (targetIndex !== currentIndex) onSelect(items[targetIndex].id)
  }

  const onTap = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (!navRef.current || !('clientX' in event)) return
    const targetIndex = getIndexFromPointer(event.clientX)
    if (targetIndex !== currentIndex) onSelect(items[targetIndex].id)
  }

  const activeIndex = scrubbing ? scrubIndex : currentIndex

  return (
    <nav
      ref={navRef}
      className='relative flex items-stretch'
    >
      {items.map((item, index) => {
        const active = index === activeIndex
        const className = 'group relative flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1.5 py-2 select-none'
        const content = (
          <>
            <span
              className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                active ? accentClass
                : hoverIndex === index ? 'bg-ink-faint/70 scale-125'
                : 'bg-ink-faint/30 group-focus-visible:bg-ink-faint/70 group-focus-visible:scale-125'
              }`}
              aria-hidden
            />
            <span
              className={`font-display text-base leading-none transition-colors duration-200 ${
                active || hoverIndex === index ? 'text-ink' : 'text-ink-soft group-focus-visible:text-ink'
              }`}
            >
              {t(locale, item.labelKey)}
            </span>
          </>
        )

        return item.href ?
            <Link
              key={item.id}
              href={item.href}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                event.preventDefault()
                if (!scrubbing && index !== currentIndex) onSelect(item.id)
              }}
              aria-current={index === currentIndex ? 'page' : undefined}
              className={className}
            >
              {content}
            </Link>
          : <button
              key={item.id}
              type='button'
              onClick={() => onSelect(item.id)}
              className={className}
            >
              {content}
            </button>
      })}

      {!scrubbing && (
        <motion.span
          layoutId={indicatorLayoutId}
          aria-hidden
          className={`absolute bottom-1.5 h-[2px] w-8 rounded-full ${accentClass}`}
          style={{
            left: `calc(${activeIndex} * ${100 / items.length}% + ${50 / items.length}% - 16px)`
          }}
          transition={reduceMotion ? { duration: 0 } : MOTION_SPRING.toolbarIndicator}
        />
      )}

      {scrubbing && (
        <motion.span
          aria-hidden
          className={`absolute bottom-1.5 h-[2px] w-8 rounded-full ${accentClass}`}
          style={{ x: indicatorX, left: 0 }}
        />
      )}

      <motion.div
        className='absolute inset-0 z-10 cursor-pointer touch-none active:cursor-grabbing'
        drag='x'
        dragElastic={0}
        dragConstraints={{ left: 0, right: 0 }}
        dragMomentum={false}
        onDragStart={onDragStart}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        onHoverStart={(event) => {
          const idx = getIndexFromPointer((event as PointerEvent).clientX)
          setHoverIndex(idx)
        }}
        onHoverEnd={() => setHoverIndex(null)}
        onPointerMove={(event) => {
          const idx = getIndexFromPointer(event.clientX)
          setHoverIndex(idx)
        }}
        onTap={onTap}
        style={{ x: 0 }}
      />
    </nav>
  )
}
