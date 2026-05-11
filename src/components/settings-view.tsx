'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getUserGroups } from '../actions'
import { authClient } from '../lib/auth-client'
import { resolveAvatarUrl } from '../lib/avatar'
import { t, type TKey } from '../lib/i18n'
import { MOTION_OFFSET, MOTION_SPRING, MOTION_TRANSITION } from '../lib/motion'
import { applyLocalIdentity, queuePalette, queueTheme, selectLocale, selectPalette, selectTheme, switchLocale, useOfflineState } from '../lib/offline-store'
import { getMemberColor, getMemberFirstName, getMemberFullName, PALETTES, type Locale, type Palette, type Theme } from '../lib/types'
import { AppShell } from './app-shell'
import { Avatar } from './avatar'
import { Button, ButtonLink, usePromiseStatus } from './button'
import { ConnectionsSheet } from './connections-sheet'
import { Onboarding } from './onboarding'
import { PasskeysSheet } from './passkeys-sheet'
import { Skel } from './skeleton'
import { Tabs, type TabItem } from './tabs'

type Tab = 'visual' | 'group' | 'account'

const TABS = [
  { id: 'visual', labelKey: 'settings.tab.visual' },
  { id: 'group', labelKey: 'settings.tab.group' },
  { id: 'account', labelKey: 'settings.tab.account' }
] satisfies TabItem<Tab>[]

const PALETTE_KEYS = Object.keys(PALETTES) as Palette[]

const THEME_MODES: { id: Theme; labelKey: TKey; glyph: string }[] = [
  { id: 'light', labelKey: 'settings.light', glyph: '☀' },
  { id: 'dark', labelKey: 'settings.dark', glyph: '☾' },
  { id: 'system', labelKey: 'settings.auto', glyph: '◐' }
]

const LOCALE_OPTIONS: { id: Locale; label: string }[] = [
  { id: 'pt', label: 'Português' },
  { id: 'en', label: 'English' }
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
  const prevTabRef = useRef(tab)

  useEffect(() => {
    if (prevTabRef.current !== tab) {
      const prevIndex = TABS.findIndex((t) => t.id === prevTabRef.current)
      const nextIndex = TABS.findIndex((t) => t.id === tab)
      setDirection(nextIndex > prevIndex ? 1 : -1)
      prevTabRef.current = tab
    }
  }, [tab])

  const goTo = (id: Tab) => {
    if (id === tab) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.replace(`/settings?${params}`, { scroll: false })
  }

  if (!state.identity || !state.activeGroupId) return <Onboarding />

  const who = state.identity

  return (
    <AppShell>
      <div className='flex min-h-0 flex-1 flex-col pt-[max(env(safe-area-inset-top),1.25rem)]'>
        <div className='px-5 pb-1'>
          <h1 className='font-display text-2xl tracking-tight'>{t(locale, 'settings.title')}</h1>
        </div>

        <div className='px-5 pt-2 pb-0'>
          <Tabs
            items={TABS}
            activeId={tab}
            locale={locale}
            layoutId='settings-tab'
            onSelect={goTo}
          />
        </div>

        <div className='relative min-h-0 flex-1 overflow-hidden'>
          <AnimatePresence
            mode='sync'
            initial={false}
          >
            <motion.div
              key={tab}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * MOTION_OFFSET.tab }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -direction * MOTION_OFFSET.tab }}
              transition={MOTION_TRANSITION.tab}
              className='scroll-area absolute inset-0 overflow-y-auto px-5 py-5'
            >
              {tab === 'visual' && (
                <VisualTab
                  locale={locale}
                  reduce={reduce}
                />
              )}
              {tab === 'group' && (
                <GroupTab
                  locale={locale}
                  activeGroupId={state.activeGroupId}
                  isOwner={state.groupMembers.find((m) => m.userId === who)?.role === 'owner'}
                />
              )}
              {tab === 'account' && (
                <AccountTab
                  locale={locale}
                  who={who}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
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
                    transition={reduce ? { duration: 0 } : MOTION_SPRING.selection}
                  >
                    ✓
                  </motion.span>
                )}
                <span className='text-xl leading-none'>{mode.glyph}</span>
                <span className={`text-xs transition-colors ${active ? 'text-ink' : 'text-ink-faint'}`}>{t(locale, mode.labelKey)}</span>
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
                    active ? 'border-ink scale-[1.02]' : 'hover:border-line border-transparent'
                  }`}
                  style={{ background: preview.bg }}
                >
                  <div className='flex gap-1'>
                    <span
                      className='h-2.5 w-2.5 rounded-full'
                      style={{ background: preview.sage }}
                    />
                    <span
                      className='h-2.5 w-2.5 rounded-full'
                      style={{ background: preview.clay }}
                    />
                  </div>
                  {active && (
                    <motion.span
                      layoutId='palette-active'
                      className='bg-ink absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] leading-none'
                      style={{ color: preview.bg }}
                      transition={reduce ? { duration: 0 } : MOTION_SPRING.selection}
                    >
                      ✓
                    </motion.span>
                  )}
                </div>
                <span className={`text-xs transition-colors ${active ? 'text-ink' : 'text-ink-faint'}`}>{t(locale, `palette.${id}` as TKey)}</span>
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
                    transition={reduce ? { duration: 0 } : MOTION_SPRING.selection}
                  >
                    ✓
                  </motion.span>
                )}
                <span className={`font-display text-sm transition-colors ${active ? 'text-ink' : 'text-ink-faint'}`}>{opt.label}</span>
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
        {groupName !== null ?
          <p className='font-display mt-1 text-xl'>{groupName}</p>
        : <Skel className='mt-2 h-6 w-36' />}
      </div>

      <div className='mt-1 flex flex-col gap-2'>
        {isOwner && (
          <ButtonLink
            href={`/groups/${activeGroupId}/edit`}
            variant='row'
            size='md'
            fullWidth
            trailing={<span className='text-ink-faint text-xs'>→</span>}
          >
            {t(locale, 'settings.editGroup')}
          </ButtonLink>
        )}
        {isOwner && (
          <ButtonLink
            href={`/groups/${activeGroupId}/manage`}
            variant='row'
            size='md'
            fullWidth
            trailing={<span className='text-ink-faint text-xs'>→</span>}
          >
            {t(locale, 'settings.manageMembers')}
          </ButtonLink>
        )}
        <ButtonLink
          href='/groups'
          variant='row'
          size='md'
          fullWidth
          trailing={<span className='text-ink-faint text-xs'>→</span>}
        >
          {t(locale, 'settings.manageGroups')}
        </ButtonLink>
      </div>
    </div>
  )
}

// ─── Account tab ──────────────────────────────────────────────────────────────

function AccountTab({ locale, who }: { locale: Locale; who: string }) {
  const router = useRouter()
  const state = useOfflineState()
  const me = getMemberColor(who, state.groupMembers)
  const myFirstName = getMemberFirstName(who, state.groupMembers)
  const myFullName = getMemberFullName(who, state.groupMembers)
  const myMember = state.groupMembers.find((m) => m.userId === who)
  const myEmail = myMember?.email ?? ''
  const myImage = resolveAvatarUrl(myMember?.image ?? null)
  const [passkeysOpen, setPasskeysOpen] = useState(false)
  const [connectionsOpen, setConnectionsOpen] = useState(false)
  const signOut = usePromiseStatus({ resetMs: 1400 })

  const rowArrow = <span className='text-ink-faint text-xs'>→</span>
  const signOutArrow = <span className='text-xs opacity-60'>→</span>

  const handleSignOut = () =>
    signOut.run(async () => {
      await authClient.signOut()
      applyLocalIdentity(null)
      router.replace('/auth')
      router.refresh()
    })

  return (
    <div className='flex flex-col gap-4 pb-[max(env(safe-area-inset-bottom),1rem)]'>
      <ButtonLink
        href='/settings/profile'
        variant='row'
        size='lg'
        shape='rounded'
        fullWidth
        className='gap-4 px-5 py-4'
        leading={
          <Avatar
            image={myImage}
            firstName={myFirstName}
            accentBg={me.bg}
            size={48}
            initialClassName='text-lg font-medium'
          />
        }
        trailing={rowArrow}
      >
        <span className='flex min-w-0 flex-1 flex-col items-start'>
          <span className='text-ink font-display text-lg leading-tight'>{myFullName}</span>
          <span className='text-ink-faint mt-0.5 truncate text-xs'>{myEmail}</span>
        </span>
      </ButtonLink>

      <ButtonLink
        href='/settings/password'
        variant='row'
        size='md'
        fullWidth
        trailing={rowArrow}
      >
        {t(locale, 'settings.changePassword')}
      </ButtonLink>

      <Button
        variant='row'
        size='md'
        fullWidth
        onClick={() => setPasskeysOpen(true)}
        trailing={rowArrow}
      >
        {t(locale, 'settings.managePasskeys')}
      </Button>

      <Button
        variant='row'
        size='md'
        fullWidth
        onClick={() => setConnectionsOpen(true)}
        trailing={rowArrow}
      >
        {t(locale, 'settings.manageConnections')}
      </Button>

      <PasskeysSheet
        open={passkeysOpen}
        onClose={() => setPasskeysOpen(false)}
        locale={locale}
      />

      <ConnectionsSheet
        open={connectionsOpen}
        onClose={() => setConnectionsOpen(false)}
        locale={locale}
      />

      <Button
        variant='destructive-outline'
        size='md'
        fullWidth
        status={signOut.status}
        pendingLabel={t(locale, 'settings.signingOut')}
        successLabel={t(locale, 'settings.signedOut')}
        errorLabel={t(locale, 'settings.signOutError')}
        trailing={signOut.status === 'idle' ? signOutArrow : null}
        onClick={handleSignOut}
      >
        {t(locale, 'settings.signOut')}
      </Button>
    </div>
  )
}
