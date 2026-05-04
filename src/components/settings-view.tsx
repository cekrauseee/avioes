'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useSyncExternalStore } from 'react'
import { queuePalette, queueTheme, selectPalette, selectTheme, useOfflineState } from '../lib/offline-store'
import { PALETTES, type Palette, type Theme } from '../lib/types'
import { AppShell } from './app-shell'
import { Onboarding } from './onboarding'

const PALETTE_KEYS = Object.keys(PALETTES) as Palette[]

const THEME_MODES: { id: Theme; label: string; glyph: string }[] = [
  { id: 'light', label: 'Claro', glyph: '☀' },
  { id: 'dark', label: 'Escuro', glyph: '☾' },
  { id: 'system', label: 'Auto', glyph: '◐' }
]

function subscribeSystemDark(callback: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function useEffectiveDark(theme: Theme): boolean {
  const systemDark = useSyncExternalStore(subscribeSystemDark, getSystemDark, () => false)
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return systemDark
}

export function SettingsView() {
  const state = useOfflineState()
  const currentTheme = selectTheme(state)
  const currentPalette = selectPalette(state)
  const reducedMotion = useReducedMotion()
  const isDark = useEffectiveDark(currentTheme)

  if (!state.identity) return <Onboarding />

  return (
    <AppShell scroll>
      <div className='flex h-full flex-col'>
        <header className='px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-3'>
          <h1 className='font-display text-3xl tracking-tight'>Ajustes</h1>
          <p className='font-display text-ink-soft mt-1 text-sm italic'>Deixe do seu jeito.</p>
        </header>

        <div className='scroll-area fade-scroll flex-1 overflow-y-auto px-5 pt-2 pb-8'>
          <section>
            <h2 className='text-ink-faint text-xs'>modo</h2>
            <div className='mt-3 grid grid-cols-3 gap-3'>
              {THEME_MODES.map((mode) => {
                const active = currentTheme === mode.id
                return (
                  <button
                    key={mode.id}
                    type='button'
                    onClick={() => queueTheme(mode.id)}
                    className={`relative flex flex-col items-center gap-1 rounded-xl border-2 py-4 transition-all ${
                      active ? 'bg-paper border-ink' : 'border-line hover:border-ink-faint'
                    }`}
                  >
                    <span className='text-xl leading-none'>{mode.glyph}</span>
                    <span className={`text-xs transition-colors ${active ? 'text-ink' : 'text-ink-faint'}`}>{mode.label}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className='mt-8'>
            <h2 className='text-ink-faint text-xs'>paleta</h2>
            <div className='mt-3 grid grid-cols-3 gap-3'>
              {PALETTE_KEYS.map((id) => {
                const meta = PALETTES[id]
                const preview = isDark ? meta.dark : meta.light
                const active = currentPalette === id
                return (
                  <button
                    key={id}
                    type='button'
                    onClick={() => queuePalette(id)}
                    className='group flex flex-col items-center gap-1.5'
                  >
                    <div
                      className={`relative flex aspect-[4/3] w-full items-end rounded-xl border-2 p-2.5 transition-all ${
                        active ? 'border-ink scale-[1.02]' : 'border-transparent hover:border-line'
                      }`}
                      style={{ background: preview.bg }}
                    >
                      <div className='flex gap-1.5'>
                        <span
                          className='h-3 w-3 rounded-full'
                          style={{ background: preview.sage }}
                        />
                        <span
                          className='h-3 w-3 rounded-full'
                          style={{ background: preview.clay }}
                        />
                      </div>
                      {active && (
                        <motion.span
                          layoutId='palette-active'
                          className='bg-ink absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] leading-none'
                          style={{ color: preview.bg }}
                          transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                        >
                          ✓
                        </motion.span>
                      )}
                    </div>
                    <span className={`text-xs transition-colors ${active ? 'text-ink' : 'text-ink-faint'}`}>{meta.label}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
