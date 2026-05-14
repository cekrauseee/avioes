'use client'

import type { TKey } from '@airplanes/i18n'
import { t, tf } from '@airplanes/i18n'
import type { Theme } from '@airplanes/types'
import type { ComponentType } from 'react'
import { queueTheme, selectLocale, selectTheme, useOfflineState } from '../lib/offline-store'
import { IconMoon, IconSun, IconSunMoon } from './icons'

const order: Theme[] = ['system', 'light', 'dark']
const labelKeys: Record<Theme, TKey> = {
  system: 'settings.auto',
  light: 'settings.light',
  dark: 'settings.dark'
}
const icons: Record<Theme, ComponentType<{ size?: number }>> = {
  system: IconSunMoon,
  light: IconSun,
  dark: IconMoon
}

export function ThemeToggle() {
  const state = useOfflineState()
  const theme = selectTheme(state)
  const locale = selectLocale(state)
  const next = order[(order.indexOf(theme) + 1) % order.length]
  const Icon = icons[theme]
  return (
    <button
      type='button'
      onClick={() => queueTheme(next)}
      aria-label={tf(locale, 'settings.themeToggleAria', { label: t(locale, labelKeys[theme]) })}
      className='group text-ink-soft hover:bg-line/50 hover:text-ink focus-visible:bg-line/50 focus-visible:text-ink -mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-lg leading-none transition-colors active:scale-90'
    >
      <span
        aria-hidden
        className='inline-block transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[20deg] group-focus-visible:scale-110 group-focus-visible:rotate-[20deg]'
      >
        <Icon size={20} />
      </span>
    </button>
  )
}
