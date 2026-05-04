'use client'

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import { getUserGroups } from '../actions'
import { authClient } from '../lib/auth-client'
import { t, type TKey } from '../lib/i18n'
import { useNavDirection } from '../lib/nav-direction'
import { applyLocalIdentity, queuePalette, queueTheme, selectLocale, selectPalette, selectTheme, switchLocale, useOfflineState } from '../lib/offline-store'
import { getMemberColor, getMemberName, PALETTES, type Locale, type Palette, type Theme } from '../lib/types'
import { AppShell } from './app-shell'
import { Onboarding } from './onboarding'
import { ToolbarTabs, type ToolbarTabItem } from './toolbar-tabs'

type Tab = 'visual' | 'group' | 'account'

const TABS = [
  { id: 'visual', labelKey: 'settings.tab.visual' },
  { id: 'group', labelKey: 'settings.tab.group' },
  { id: 'account', labelKey: 'settings.tab.account' },
] satisfies ToolbarTabItem<Tab>[]

const SETTINGS_PREV_ROUTE = '/scoreboard'
const SWIPE_THRESHOLD = 60

const PALETTE_KEYS = Object.keys(PALETTES) as Palette[]

const THEME_MODES: { id: Theme; labelKey: TKey; glyph: string }[] = [
  { id: 'light', labelKey: 'settings.light', glyph: '☀' },
  { id: 'dark', labelKey: 'settings.dark', glyph: '☾' },
  { id: 'system', labelKey: 'settings.auto', glyph: '◐' }
]

const LOCALE_OPTIONS: { id: Locale; label: string }[] = [
  { id: 'pt', label: 'Português' },
  { id: 'en', label: 'English' },
]

function subscribeSystemDark(cb: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
function getSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function SettingsView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const rawTab = searchParams.get('tab')
  const tab = (TABS.some((t) => t.id === rawTab) ? rawTab : 'visual') as Tab
  const [direction, setDirection] = useState<1 | -1>(1)
  const reduce = useReducedMotion()
  const { set: setNavDirection } = useNavDirection()

  if (!state.identity || !state.activeGroupId) return <Onboarding />

  const currentIndex = TABS.findIndex((t) => t.id === tab)
  const who = state.identity
  const accent = getMemberColor(who, state.groupMembers)

  const goTo = (id: Tab) => {
    const nextIndex = TABS.findIndex((t) => t.id === id)
    if (id === tab) return
    setDirection(nextIndex > currentIndex ? 1 : -1)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.replace(`/settings?${params}`, { scroll: false })
  }

  const goByDirection = (nextDirection: 1 | -1) => {
    const nextIndex = currentIndex + nextDirection
    const nextTab = TABS[nextIndex]

    if (nextTab) {
      setDirection(nextDirection)
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', nextTab.id)
      router.replace(`/settings?${params}`, { scroll: false })
      return
    }

    if (nextDirection === -1) {
      setNavDirection(-1)
      router.push(SETTINGS_PREV_ROUTE)
    }
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && info.velocity.x < 0) goByDirection(1)
    else if (info.offset.x > SWIPE_THRESHOLD && info.velocity.x > 0) goByDirection(-1)
  }

  return (
    <AppShell>
      <div className='flex h-full flex-col pt-[max(env(safe-area-inset-top),1.25rem)]'>

        {/* header */}
        <div className='px-5 pb-1'>
          <h1 className='font-display text-2xl tracking-tight'>{t(locale, 'settings.title')}</h1>
        </div>

        {/* tab bar */}
        <div className='relative px-5 pb-0'>
          <ToolbarTabs
            items={TABS}
            activeId={tab}
            accentClass={accent.bg}
            locale={locale}
            indicatorLayoutId='settings-tab-indicator'
            onSelect={goTo}
          />
        </div>

        {/* tab content */}
        <motion.div
          className='relative flex-1 touch-pan-y overflow-hidden'
          drag={reduce ? false : 'x'}
          dragElastic={0.15}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={onDragEnd}
          whileDrag={{ cursor: 'grabbing' }}
        >
          <AnimatePresence mode='sync' initial={false}>
            <motion.div
              key={tab}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 32, filter: 'blur(4px)' }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -direction * 32, filter: 'blur(4px)' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className='absolute inset-0 overflow-y-auto px-5 py-5'
            >
              {tab === 'visual' && <VisualTab locale={locale} reduce={reduce} />}
              {tab === 'group' && <GroupTab locale={locale} activeGroupId={state.activeGroupId} isOwner={state.groupMembers.find(m => m.userId === who)?.role === 'owner'} />}
              {tab === 'account' && <AccountTab locale={locale} who={who} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>

      </div>
    </AppShell>
  )
}

// ─── Visual tab ──────────────────────────────────────────────────────────────

function VisualTab({ locale, reduce }: { locale: Locale; reduce: boolean | null }) {
  const state = useOfflineState()
  const currentTheme = selectTheme(state)
  const currentPalette = selectPalette(state)
  const currentLocale = selectLocale(state)

  const systemDark = useSyncExternalStore(subscribeSystemDark, getSystemDark, () => false)
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemDark)

  return (
    <div className='flex flex-col gap-6 pb-[max(env(safe-area-inset-bottom),1rem)]'>
      {/* theme mode */}
      <section>
        <h2 className='text-ink-faint mb-3 text-xs'>{t(locale, 'settings.mode')}</h2>
        <div className='grid grid-cols-3 gap-2.5'>
          {THEME_MODES.map((mode) => {
            const active = currentTheme === mode.id
            return (
              <button
                key={mode.id}
                type='button'
                onClick={() => queueTheme(mode.id)}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-all ${
                  active ? 'bg-paper border-ink' : 'border-line hover:border-ink-faint'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId='theme-active'
                    className='bg-ink text-bg absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] leading-none'
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    ✓
                  </motion.span>
                )}
                <span className='text-xl leading-none'>{mode.glyph}</span>
                <span className={`text-xs transition-colors ${active ? 'text-ink' : 'text-ink-faint'}`}>
                  {t(locale, mode.labelKey)}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* palette */}
      <section>
        <h2 className='text-ink-faint mb-3 text-xs'>{t(locale, 'settings.palette')}</h2>
        <div className='grid grid-cols-3 gap-2.5'>
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
                  className={`relative flex aspect-[3/2] w-full items-end rounded-xl border-2 p-2 transition-all ${
                    active ? 'border-ink scale-[1.02]' : 'border-transparent hover:border-line'
                  }`}
                  style={{ background: preview.bg }}
                >
                  <div className='flex gap-1'>
                    <span className='h-2.5 w-2.5 rounded-full' style={{ background: preview.sage }} />
                    <span className='h-2.5 w-2.5 rounded-full' style={{ background: preview.clay }} />
                  </div>
                  {active && (
                    <motion.span
                      layoutId='palette-active'
                      className='bg-ink absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] leading-none'
                      style={{ color: preview.bg }}
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                    >
                      ✓
                    </motion.span>
                  )}
                </div>
                <span className={`text-xs transition-colors ${active ? 'text-ink' : 'text-ink-faint'}`}>
                  {t(locale, `palette.${id}` as TKey)}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* language */}
      <section>
        <h2 className='text-ink-faint mb-3 text-xs'>{t(locale, 'settings.language')}</h2>
        <div className='grid grid-cols-2 gap-2.5'>
          {LOCALE_OPTIONS.map((opt) => {
            const active = currentLocale === opt.id
            return (
              <button
                key={opt.id}
                type='button'
                onClick={() => switchLocale(opt.id)}
                className={`relative flex items-center justify-center rounded-xl border-2 py-3.5 transition-all ${
                  active ? 'bg-paper border-ink' : 'border-line hover:border-ink-faint'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId='locale-active'
                    className='bg-ink text-bg absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] leading-none'
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    ✓
                  </motion.span>
                )}
                <span className={`font-display text-sm transition-colors ${active ? 'text-ink' : 'text-ink-faint'}`}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ─── Group tab ────────────────────────────────────────────────────────────────

function GroupTab({ locale, activeGroupId, isOwner }: { locale: Locale; activeGroupId: string; isOwner: boolean }) {
  const [groupName, setGroupName] = useState<string | null>(null)

  useEffect(() => {
    getUserGroups().then((groups) => {
      const match = groups.find((g) => g.id === activeGroupId)
      if (match) setGroupName(match.name)
    })
  }, [activeGroupId])

  return (
    <div className='flex flex-col gap-3 pb-[max(env(safe-area-inset-bottom),1rem)]'>
      {/* group name display */}
      <div className='border-line rounded-2xl border px-5 py-4'>
        <p className='text-ink-faint text-xs'>{t(locale, 'settings.currentGroup')}</p>
        <p className='font-display mt-1 text-xl'>
          {groupName ?? <span className='text-ink-faint italic text-base'>{t(locale, 'settings.loading')}</span>}
        </p>
      </div>

      <div className='flex flex-col gap-2 mt-1'>
        {isOwner && (
          <Link
            href={`/groups/${activeGroupId}/edit`}
            className='border-line flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors hover:bg-paper'
          >
            <span className='text-ink-soft text-sm'>{t(locale, 'settings.editGroup')}</span>
            <span className='text-ink-faint text-xs'>→</span>
          </Link>
        )}
        {isOwner && (
          <Link
            href={`/groups/${activeGroupId}/manage`}
            className='border-line flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors hover:bg-paper'
          >
            <span className='text-ink-soft text-sm'>{t(locale, 'settings.manageMembers')}</span>
            <span className='text-ink-faint text-xs'>→</span>
          </Link>
        )}
        <Link
          href='/groups'
          className='border-line flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors hover:bg-paper'
        >
          <span className='text-ink-soft text-sm'>{t(locale, 'settings.manageGroups')}</span>
          <span className='text-ink-faint text-xs'>→</span>
        </Link>
      </div>
    </div>
  )
}

// ─── Account tab ──────────────────────────────────────────────────────────────

function AccountTab({ locale, who }: { locale: Locale; who: string }) {
  const router = useRouter()
  const state = useOfflineState()
  const me = getMemberColor(who, state.groupMembers)
  const myName = getMemberName(who, state.groupMembers)
  const myEmail = state.groupMembers.find((m) => m.userId === who)?.email ?? ''
  const [, startSignOut] = useTransition()

  const handleSignOut = () => {
    startSignOut(async () => {
      await authClient.signOut()
      applyLocalIdentity(null)
      router.replace('/auth')
      router.refresh()
    })
  }

  return (
    <div className='flex flex-col gap-4 pb-[max(env(safe-area-inset-bottom),1rem)]'>
      {/* user card */}
      <div className='border-line flex items-center gap-4 rounded-2xl border px-5 py-4'>
        <div className={`h-12 w-12 shrink-0 rounded-full ${me.bg} flex items-center justify-center`}>
          <span className='text-bg text-lg font-medium'>{myName.slice(0, 1).toUpperCase()}</span>
        </div>
        <div className='min-w-0'>
          <p className='text-ink font-display text-lg leading-tight'>{myName}</p>
          <p className='text-ink-faint mt-0.5 truncate text-xs'>{myEmail}</p>
        </div>
      </div>

      {/* sign out */}
      <button
        type='button'
        onClick={handleSignOut}
        className='border-clay/30 text-clay hover:bg-clay/8 flex items-center justify-between rounded-xl border px-4 py-3.5 text-sm transition-colors'
      >
        <span>{t(locale, 'settings.signOut')}</span>
        <span className='text-xs opacity-60'>→</span>
      </button>
    </div>
  )
}
