'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const PANEL_EASE = [0.22, 1, 0.36, 1] as const

export function ExpandableItem({
  main,
  expanded,
  onToggle,
  toggleAriaLabel,
  active,
  children
}: {
  main: ReactNode
  expanded: boolean
  onToggle: () => void
  toggleAriaLabel: string
  active?: boolean
  children?: ReactNode
}) {
  return (
    <div className={`border-line bg-paper overflow-hidden rounded-2xl border ${active ? 'ring-sage/30 ring-2' : ''}`}>
      <div className='flex items-stretch'>
        {main}
        <button
          type='button'
          onClick={onToggle}
          aria-label={toggleAriaLabel}
          aria-expanded={expanded}
          className={`text-ink-faint hover:text-ink-soft border-line flex w-14 shrink-0 items-center justify-center border-l text-xl leading-none transition-colors ${expanded ? 'bg-line/30' : ''}`}
        >
          ⋯
        </button>
      </div>
      <AnimatePresence initial={false}>{expanded && <ExpandablePanel key='content'>{children}</ExpandablePanel>}</AnimatePresence>
    </div>
  )
}

function ExpandablePanel({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const node = contentRef.current
    if (!node) return

    const updateHeight = () => setHeight(node.getBoundingClientRect().height)
    updateHeight()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(updateHeight)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: PANEL_EASE }}
      className='border-line overflow-hidden border-t'
    >
      <div ref={contentRef}>{children}</div>
    </motion.div>
  )
}
