'use client'

import { motion, useReducedMotion } from 'motion/react'
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

  return (
    <div
      role='tablist'
      className='bg-bg-soft/60 border-line inline-flex gap-1 rounded-full border p-1'
    >
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            role='tab'
            type='button'
            aria-selected={active}
            onClick={() => onSelect(item.id)}
            className='relative rounded-full px-4 py-1.5'
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className='bg-paper border-line absolute inset-0 rounded-full border'
                transition={reduce ? { duration: 0 } : MOTION_SPRING.selection}
              />
            )}
            <span className={`font-display relative text-sm leading-none transition-colors duration-150 ${active ? 'text-ink' : 'text-ink-faint'}`}>
              {t(locale, item.labelKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
