'use client'

import { motion, useReducedMotion, type PanInfo } from 'motion/react'
import { useRef, useState } from 'react'
import { t, type TKey } from '../lib/i18n'
import { MOTION_SPRING } from '../lib/motion'
import type { Locale } from '../lib/types'

export type TabItem<Id extends string> = {
  id: Id
  labelKey: TKey
}

export function Tabs<Id extends string>({
  items,
  activeId,
  locale,
  layoutId,
  onSelect
}: {
  items: TabItem<Id>[]
  activeId: Id
  locale: Locale
  layoutId: string
  onSelect: (id: Id) => void
}) {
  const reduce = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrubbing, setScrubbing] = useState(false)
  const [scrubIndex, setScrubIndex] = useState(0)

  const currentIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId)
  )

  const getIndexFromPointer = (pointX: number) => {
    if (!containerRef.current) return currentIndex
    const rect = containerRef.current.getBoundingClientRect()
    const relX = pointX - rect.left
    const tabWidth = rect.width / items.length
    return Math.max(0, Math.min(items.length - 1, Math.floor(relX / tabWidth)))
  }

  const onDragStart = (_: unknown, info: PanInfo) => {
    setScrubbing(true)
    setScrubIndex(currentIndex)
    const idx = getIndexFromPointer(info.point.x)
    if (idx !== currentIndex) setScrubIndex(idx)
  }

  const onDrag = (_: unknown, info: PanInfo) => {
    const idx = getIndexFromPointer(info.point.x)
    if (idx !== scrubIndex) setScrubIndex(idx)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    setScrubbing(false)
    const targetIndex = getIndexFromPointer(info.point.x)
    if (targetIndex !== currentIndex) onSelect(items[targetIndex].id)
  }

  const activeIndex = scrubbing ? scrubIndex : currentIndex

  return (
    <div
      ref={containerRef}
      role='tablist'
      className='relative inline-flex'
    >
      <div className='bg-bg-soft/60 border-line inline-flex gap-1 rounded-full border p-1'>
        {items.map((item, index) => {
          const active = index === activeIndex
          return (
            <button
              key={item.id}
              role='tab'
              type='button'
              aria-selected={item.id === activeId}
              onClick={() => onSelect(item.id)}
              className='group relative rounded-full px-4 py-1.5'
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className='bg-paper border-line absolute inset-0 rounded-full border'
                  transition={reduce ? { duration: 0 } : MOTION_SPRING.selection}
                />
              )}
              {!active && (
                <span className='group-hover:bg-ink/5 absolute inset-0 rounded-full opacity-0 transition-opacity duration-150 group-hover:opacity-100' />
              )}
              <span
                className={`font-display relative text-sm leading-none transition-colors duration-150 ${
                  active ? 'text-ink' : 'text-ink-faint group-hover:text-ink-soft'
                }`}
              >
                {t(locale, item.labelKey)}
              </span>
            </button>
          )
        })}
      </div>

      <motion.div
        className='absolute inset-0 z-10 cursor-pointer touch-none rounded-full active:cursor-grabbing'
        drag='x'
        dragElastic={0}
        dragConstraints={{ left: 0, right: 0 }}
        dragMomentum={false}
        onDragStart={onDragStart}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        onTap={(event) => {
          if (!containerRef.current || !('clientX' in event)) return
          const targetIndex = getIndexFromPointer((event as PointerEvent).clientX)
          if (targetIndex !== currentIndex) onSelect(items[targetIndex].id)
        }}
        style={{ x: 0 }}
      />
    </div>
  )
}
