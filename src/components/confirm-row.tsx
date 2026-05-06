'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'

const FADE_TRANSITION = { duration: 0.12, ease: [0.22, 1, 0.36, 1] } as const
// Requires a `position: relative` parent (ConfirmActionSlot provides this)
const EXIT_FADE = { opacity: 0, position: 'absolute', top: 0, right: 0, left: 0 } as const

export function ConfirmActionSlot({ children }: { children: ReactNode }) {
  return (
    <div className='relative'>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </div>
  )
}

export function ConfirmTriggerRow({
  label,
  icon,
  disabled,
  bordered,
  onClick
}: {
  label: string
  icon: ReactNode
  disabled?: boolean
  bordered?: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type='button'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={EXIT_FADE}
      transition={FADE_TRANSITION}
      disabled={disabled}
      onClick={onClick}
      className={`text-clay hover:bg-clay/8 flex min-h-12 w-full items-center justify-between px-5 text-sm transition-colors disabled:opacity-50 ${bordered ? 'border-line border-t' : ''}`}
    >
      <span>{label}</span>
      <span>{icon}</span>
    </motion.button>
  )
}

export function ConfirmRow({
  label,
  busy,
  disabled,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  bordered
}: {
  label: string
  busy: boolean
  disabled?: boolean
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  bordered?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={EXIT_FADE}
      transition={FADE_TRANSITION}
      className={`flex w-full flex-col ${bordered ? 'border-line border-t' : ''}`}
    >
      <span className='text-clay flex min-h-12 items-center px-5 py-2 text-sm'>{label}</span>
      <div className='border-line grid grid-cols-2 border-t'>
        <button
          type='button'
          onClick={onCancel}
          disabled={busy}
          className='text-ink-soft hover:bg-line/40 min-h-14 text-sm transition-colors disabled:opacity-50'
        >
          {cancelLabel}
        </button>
        <button
          type='button'
          onClick={onConfirm}
          disabled={busy || disabled}
          className='bg-clay text-bg border-line min-h-14 border-l text-sm font-medium transition-colors disabled:opacity-60'
        >
          {busy ?
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              …
            </motion.span>
          : confirmLabel}
        </button>
      </div>
    </motion.div>
  )
}
