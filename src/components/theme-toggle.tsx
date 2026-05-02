'use client'

import { queueTheme, selectTheme, useOfflineState } from '../lib/offline-store'
import type { Theme } from '../lib/types'

const order: Theme[] = ['system', 'light', 'dark']
const labels: Record<Theme, string> = {
  system: 'auto',
  light: 'claro',
  dark: 'escuro'
}
const glyphs: Record<Theme, string> = {
  system: '◐',
  light: '☀',
  dark: '☾'
}

export function ThemeToggle() {
  const state = useOfflineState()
  const theme = selectTheme(state)
  const next = order[(order.indexOf(theme) + 1) % order.length]
  return (
    <button
      type='button'
      onClick={() => queueTheme(next)}
      aria-label={`Tema: ${labels[theme]}, tocar para mudar`}
      className='group text-ink-soft hover:bg-line/50 hover:text-ink focus-visible:bg-line/50 focus-visible:text-ink -mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-lg leading-none transition-colors active:scale-90'
    >
      <span
        aria-hidden
        className='inline-block transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[20deg] group-focus-visible:scale-110 group-focus-visible:rotate-[20deg]'
      >
        {glyphs[theme]}
      </span>
    </button>
  )
}
