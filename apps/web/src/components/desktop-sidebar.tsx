'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { startTransition, useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { getMyProfile, getUserGroups, setActiveGroup } from '../actions'
import { authClient } from '@airplanes/auth/client'
import { resolveAvatarUrl } from '../lib/avatar'
import { t, type TKey } from '@airplanes/i18n'
import { MOTION_SPRING, MOTION_TRANSITION } from '../lib/motion'
import { useNavDirection } from '../lib/nav-direction'
import { applyLocalIdentity, applyServerSnapshot, selectLocale, useOfflineState } from '../lib/offline-store'
import type { UserProfile } from '@airplanes/db/store'
import { getMemberColor, getMemberFirstName, getMemberFullName, type Group, type Identity } from '@airplanes/types'
import { Avatar } from './avatar'
import { IconBarChart, IconBook, IconChevronDown, IconChevronRight, IconHash, IconLogOut, IconPlus, IconSettings } from './icons'

const EXPANDED = 240
const COLLAPSED = 72

function SidebarTooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const onEnter = () => {
    if (!show) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ top: r.top + r.height / 2, left: r.left + COLLAPSED - 12 })
  }

  return (
    <div
      ref={ref}
      onMouseEnter={onEnter}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {pos && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={MOTION_TRANSITION.fastFade}
              className='bg-bg border-line font-display text-ink pointer-events-none fixed z-50 -translate-y-1/2 rounded-md border px-3 py-1.5 text-sm'
              style={{ top: pos.top, left: pos.left }}
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

type GroupEntry = Group & { memberCount: number }
type IconComponent = (props: { size?: number; className?: string }) => React.ReactNode

const NAV: { id: string; href: string; labelKey: TKey; Icon: IconComponent }[] = [
  { id: '/', href: '/', labelKey: 'nav.count', Icon: IconHash },
  { id: '/diary', href: '/diary', labelKey: 'nav.diary', Icon: IconBook },
  { id: '/scoreboard', href: '/scoreboard', labelKey: 'nav.scoreboard', Icon: IconBarChart },
  { id: '/settings', href: '/settings', labelKey: 'nav.settings', Icon: IconSettings }
]

function readCollapsed(): boolean {
  try {
    return localStorage.getItem('ap_sidebar') === '0'
  } catch {
    return false
  }
}

function writeCollapsed(v: boolean) {
  try {
    localStorage.setItem('ap_sidebar', v ? '0' : '1')
  } catch {}
}

export function DesktopSidebar({ who }: { who: Identity }) {
  const state = useOfflineState()
  const locale = selectLocale(state)
  const accent = getMemberColor(who, state.groupMembers)
  const firstName = getMemberFirstName(who, state.groupMembers)
  const fullName = getMemberFullName(who, state.groupMembers)
  const member = state.groupMembers.find((m) => m.userId === who)
  const image = resolveAvatarUrl(member?.image ?? null)

  const pathname = usePathname()
  const router = useRouter()
  const { set: setDir } = useNavDirection()
  const reduce = useReducedMotion()
  const idx = NAV.findIndex((i) => i.id === pathname)

  const [collapsed, setCollapsed] = useState(readCollapsed)

  const [groups, setGroups] = useState<GroupEntry[]>([])
  const [groupOpen, setGroupOpen] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [pending, startGroupTransition] = useTransition()
  const groupRef = useRef<HTMLButtonElement>(null)
  const [groupPos, setGroupPos] = useState({ top: 0, left: 0, width: 0 })

  const [userOpen, setUserOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const userRef = useRef<HTMLButtonElement>(null)
  const [userPos, setUserPos] = useState({ bottom: 0, left: 0, width: 0 })

  const toggle = useCallback(() => {
    setCollapsed((p) => {
      const n = !p
      writeCollapsed(n)
      return n
    })
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      for (const n of NAV) if (n.href !== pathname) router.prefetch(n.href)
    }, 250)
    return () => clearTimeout(id)
  }, [pathname, router])

  useEffect(() => {
    getUserGroups().then(setGroups)
  }, [])

  useEffect(() => {
    if (groupOpen) getUserGroups().then(setGroups)
  }, [groupOpen])

  useEffect(() => {
    if (userOpen && !profile) getMyProfile().then(setProfile)
  }, [userOpen, profile])

  const activeGroup = groups.find((g) => g.id === state.activeGroupId)

  const openGroupMenu = () => {
    const el = groupRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setGroupPos({ top: r.bottom + 4, left: r.left, width: EXPANDED - 16 })
    setGroupOpen(true)
  }

  const openUserMenu = () => {
    const el = userRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setUserPos({ bottom: window.innerHeight - r.top + 4, left: r.left, width: EXPANDED - 16 })
    setUserOpen(true)
  }

  const switchTo = (groupId: string) => {
    setSwitchingId(groupId)
    startGroupTransition(async () => {
      try {
        const snapshot = await setActiveGroup(groupId)
        if (snapshot.activeGroupId) {
          applyServerSnapshot(snapshot)
          setGroupOpen(false)
          router.replace('/')
        }
      } finally {
        setSwitchingId(null)
      }
    })
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    setUserOpen(false)
    try {
      await authClient.signOut()
    } finally {
      applyLocalIdentity(null)
      router.replace('/auth')
      router.refresh()
    }
  }

  const fade = {
    initial: false as const,
    animate: { opacity: collapsed ? 0 : 1 },
    transition: MOTION_TRANSITION.fastFade
  }

  const otherGroups = groups.filter((g) => g.id !== state.activeGroupId)

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? COLLAPSED : EXPANDED }}
        transition={reduce ? { duration: 0 } : MOTION_SPRING.sidebar}
        className='border-line pointer-events-none flex h-0 max-w-0 shrink-0 flex-col overflow-hidden border-r opacity-0 transition-[max-width,opacity] duration-200 ease-out lg:pointer-events-auto lg:h-auto lg:max-w-[280px] lg:opacity-100'
      >
        <div
          style={{ width: EXPANDED }}
          className='flex h-full flex-col px-2'
        >
          {/* Aviões — collapse/expand trigger */}
          <button
            type='button'
            onClick={toggle}
            aria-label={t(locale, collapsed ? 'sidebar.expand' : 'sidebar.collapse')}
            className='text-ink-faint hover:text-ink hover:bg-line/30 mt-3 flex items-center gap-3 rounded-lg py-2.5 pr-2 pl-[10px] transition-colors'
          >
            <span className='flex w-9 shrink-0 items-center justify-center'>
              <motion.span
                initial={false}
                animate={{ rotate: collapsed ? 0 : 180 }}
                transition={reduce ? { duration: 0 } : MOTION_TRANSITION.fastFade}
              >
                <IconChevronRight size={14} />
              </motion.span>
            </span>
            <motion.span
              {...fade}
              className='font-display text-ink text-base tracking-tight whitespace-nowrap'
            >
              Aviões
            </motion.span>
          </button>

          {/* Group selector */}
          <button
            ref={groupRef}
            type='button'
            onClick={openGroupMenu}
            className={`flex items-center gap-3 rounded-lg py-2.5 pr-2 pl-[10px] transition-colors ${groupOpen ? 'bg-line/30' : 'hover:bg-line/30'}`}
          >
            <span className='flex w-9 shrink-0 items-center justify-center'>
              <IconChevronDown
                size={14}
                className='text-ink-faint'
              />
            </span>
            <motion.span
              {...fade}
              className='font-display text-ink min-w-0 truncate text-sm'
            >
              {activeGroup?.name ?? t(locale, 'counter.group')}
            </motion.span>
          </button>

          {/* Navigation */}
          <nav className='mt-3 flex flex-col gap-0.5'>
            {NAV.map((item, i) => {
              const active = item.id === pathname
              const label = t(locale, item.labelKey)
              return (
                <SidebarTooltip
                  key={item.id}
                  label={label}
                  show={collapsed}
                >
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                      e.preventDefault()
                      if (i !== idx) {
                        setDir(i > idx ? 1 : -1)
                        startTransition(() => router.push(item.href))
                      }
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg py-2.5 pr-2 pl-[10px] transition-colors duration-200 ${active ? '' : 'hover:bg-line/30'}`}
                  >
                    <span className='flex w-9 shrink-0 items-center justify-center'>
                      <item.Icon
                        size={18}
                        className={`transition-colors duration-200 ${active ? accent.text : 'text-ink-faint/50 group-hover:text-ink-faint'}`}
                      />
                    </span>
                    <motion.span
                      {...fade}
                      className={`font-display text-base leading-none whitespace-nowrap transition-colors duration-200 ${active ? 'text-ink' : 'text-ink-soft group-hover:text-ink'}`}
                    >
                      {label}
                    </motion.span>
                    {active && (
                      <motion.span
                        layoutId='desktop-sidebar-indicator'
                        className={`absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full ${accent.bg}`}
                        transition={reduce ? { duration: 0 } : MOTION_SPRING.toolbarIndicator}
                      />
                    )}
                  </Link>
                </SidebarTooltip>
              )
            })}
          </nav>

          <div className='flex-1' />

          {/* User button */}
          <div className='pb-4'>
            <button
              ref={userRef}
              type='button'
              onClick={openUserMenu}
              className={`flex w-full items-center gap-3 rounded-lg py-2 pr-2 pl-[10px] transition-colors ${userOpen ? 'bg-line/30' : 'hover:bg-line/30'}`}
            >
              <span className='flex w-9 shrink-0 items-center justify-center'>
                <Avatar
                  image={image}
                  firstName={firstName}
                  accentBg={accent.bg}
                  size={28}
                  initialClassName='text-[10px] font-medium'
                />
              </span>
              <motion.span
                {...fade}
                className='font-display text-ink min-w-0 flex-1 truncate text-left text-sm leading-tight'
              >
                {fullName}
              </motion.span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Group selector dropdown */}
      {groupOpen &&
        createPortal(
          <div
            className='fixed inset-0 z-50'
            onClick={() => setGroupOpen(false)}
          >
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={MOTION_TRANSITION.fastFade}
                className='bg-bg border-line fixed z-50 rounded-lg border shadow-lg'
                style={{ top: groupPos.top, left: groupPos.left, width: groupPos.width }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className='max-h-[280px] overflow-y-auto p-1.5'>
                  {activeGroup && (
                    <div className='text-ink flex items-center gap-2.5 rounded-md px-3 py-2'>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent.bg}`} />
                      <span className='font-display truncate text-sm'>{activeGroup.name}</span>
                    </div>
                  )}
                  {otherGroups.map((g) => (
                    <button
                      key={g.id}
                      type='button'
                      onClick={() => switchTo(g.id)}
                      disabled={pending}
                      className='text-ink-soft hover:text-ink hover:bg-line/40 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors disabled:opacity-40'
                    >
                      <span className='bg-ink-faint/30 h-1.5 w-1.5 shrink-0 rounded-full' />
                      <span className='font-display min-w-0 flex-1 truncate text-sm'>
                        {switchingId === g.id ?
                          <motion.span
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={MOTION_TRANSITION.pulse}
                          >
                            {g.name}
                          </motion.span>
                        : g.name}
                      </span>
                    </button>
                  ))}
                </div>
                <div className='border-line border-t p-1.5'>
                  <Link
                    href='/groups/new'
                    onClick={() => setGroupOpen(false)}
                    className='text-ink-soft hover:text-ink hover:bg-line/40 flex w-full items-center gap-2.5 rounded-md px-3 py-2 transition-colors'
                  >
                    <IconPlus
                      size={12}
                      className='shrink-0'
                    />
                    <span className='font-display text-sm'>{t(locale, 'groups.sheet.create')}</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>,
          document.body
        )}

      {/* User dropdown */}
      {userOpen &&
        createPortal(
          <div
            className='fixed inset-0 z-50'
            onClick={() => setUserOpen(false)}
          >
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={MOTION_TRANSITION.fastFade}
                className='bg-bg border-line fixed z-50 rounded-lg border shadow-lg'
                style={{ bottom: userPos.bottom, left: userPos.left, width: userPos.width }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className='flex items-center gap-3 px-4 pt-4 pb-3'>
                  <Avatar
                    image={image}
                    firstName={firstName}
                    accentBg={accent.bg}
                    size={40}
                    initialClassName='text-sm font-medium'
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='font-display text-ink truncate text-sm leading-tight'>{fullName}</p>
                    {profile?.username && <p className='text-ink-faint truncate text-xs'>@{profile.username}</p>}
                    <p className='text-ink-faint truncate text-xs'>{member?.email}</p>
                  </div>
                </div>
                <div className='border-line border-t p-1.5'>
                  <button
                    type='button'
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className='text-ink-soft hover:text-ink hover:bg-line/40 flex w-full items-center gap-2.5 rounded-md px-3 py-2 transition-colors disabled:opacity-40'
                  >
                    <IconLogOut
                      size={14}
                      className='shrink-0 opacity-60'
                    />
                    <span className='font-display text-sm'>{signingOut ? t(locale, 'settings.signingOut') : t(locale, 'groups.sheet.signOut')}</span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>,
          document.body
        )}
    </>
  )
}
