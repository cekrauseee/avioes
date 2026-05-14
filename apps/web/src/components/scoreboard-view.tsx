'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { getWorldRanking, type WorldRankingResult, type WorldRankingRowDTO, type WorldRankingWindow } from '../actions'
import { resolveAvatarUrl } from '../lib/avatar'
import { DATE_LOCALE, t } from '@airplanes/i18n'
import { MOTION_OFFSET, MOTION_TRANSITION } from '../lib/motion'
import { selectEvents, selectLocale, useOfflineState } from '../lib/offline-store'
import { computeStreaks, totals } from '../lib/streaks'
import { getMemberColor, getMemberFirstName, MEMBER_COLORS, type Locale } from '@airplanes/types'
import { AppShell } from './app-shell'
import { Onboarding } from './onboarding'
import { SyncStatus } from './sync-status'
import { Tabs, type TabItem } from './tabs'
import { ThemeToggle } from './theme-toggle'

type Tab = 'group' | 'world'

const TABS: TabItem<Tab>[] = [
  { id: 'group', labelKey: 'scoreboard.tab.group' },
  { id: 'world', labelKey: 'scoreboard.tab.world' }
]

const WINDOWS: TabItem<WorldRankingWindow>[] = [
  { id: 'all', labelKey: 'world.window.all' },
  { id: 'week', labelKey: 'world.window.week' }
]

const MEDALS = ['🥇', '🥈', '🥉']

export function ScoreboardView({ initialRanking }: { initialRanking: WorldRankingResult }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const reduce = useReducedMotion()
  const rawTab = searchParams.get('tab')
  const tab = (TABS.some((t) => t.id === rawTab) ? rawTab : 'group') as Tab
  const [direction, setDirection] = useState<1 | -1>(1)

  const goTo = (id: Tab) => {
    if (id === tab) return
    const prevIndex = TABS.findIndex((t) => t.id === tab)
    const nextIndex = TABS.findIndex((t) => t.id === id)
    setDirection(nextIndex > prevIndex ? 1 : -1)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.replace(`/scoreboard?${params}`, { scroll: false })
  }

  if (!state.identity || !state.activeGroupId) return <Onboarding />

  return (
    <AppShell>
      <div className='flex min-h-0 flex-1 flex-col'>
        <header className='px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-1'>
          <div className='flex items-center justify-between'>
            <h1 className='font-display text-2xl tracking-tight'>{t(locale, 'scoreboard.title')}</h1>
            <div className='flex items-center gap-2'>
              <SyncStatus />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className='px-5 pt-2 pb-0'>
          <Tabs
            items={TABS}
            activeId={tab}
            locale={locale}
            layoutId='scoreboard-tab'
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
              className='scroll-area fade-scroll absolute inset-0 overflow-y-auto px-5 py-4'
            >
              {tab === 'group' && <GroupTab locale={locale} />}
              {tab === 'world' && (
                <WorldTab
                  initialRanking={initialRanking}
                  locale={locale}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  )
}

// ─── Group tab ──────────────────────────────────────────────────────────────────

function GroupTab({ locale }: { locale: Locale }) {
  const state = useOfflineState()
  const merged = selectEvents(state)
  const tt = totals(merged)
  const streaks = computeStreaks(merged)
  const orderedStreaks = [...streaks].reverse()

  const memberEntries = state.groupMembers.map((m, index) => ({
    member: m,
    count: tt[m.userId] ?? 0,
    longest: streaks.filter((s) => s.who === m.userId).reduce((max, s) => Math.max(max, s.count), 0),
    colorIndex: index
  }))

  const sortedByCount = [...memberEntries].sort((a, b) => b.count - a.count)
  const leader = sortedByCount[0]?.count > (sortedByCount[1]?.count ?? -1) ? sortedByCount[0] : null

  const timeFmt = new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className='flex flex-col pb-[max(env(safe-area-inset-bottom),1rem)]'>
      <p className='font-display text-ink-soft text-sm italic'>
        {leader ? `${getMemberFirstName(leader.member.userId, state.groupMembers)} ${t(locale, 'scoreboard.isAhead')}` : t(locale, 'scoreboard.tied')}
      </p>

      <span className='text-ink-faint mt-1 text-xs'>
        {merged.length} {t(locale, 'scoreboard.total')}
      </span>

      {memberEntries.length <= 2 ?
        <section className='relative mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2'>
          {memberEntries[0] && (
            <Score
              name={getMemberFirstName(memberEntries[0].member.userId, state.groupMembers)}
              image={memberEntries[0].member.image}
              count={memberEntries[0].count}
              longest={memberEntries[0].longest}
              highlight={leader?.member.userId === memberEntries[0].member.userId}
              align='left'
              colorIndex={memberEntries[0].colorIndex}
              locale={locale}
            />
          )}
          {memberEntries.length === 2 && (
            <>
              <span className='font-display text-ink-faint rotate-[-8deg] text-2xl italic'>vs</span>
              <Score
                name={getMemberFirstName(memberEntries[1].member.userId, state.groupMembers)}
                image={memberEntries[1].member.image}
                count={memberEntries[1].count}
                longest={memberEntries[1].longest}
                highlight={leader?.member.userId === memberEntries[1].member.userId}
                align='right'
                colorIndex={memberEntries[1].colorIndex}
                locale={locale}
              />
            </>
          )}
        </section>
      : <section className='mt-5 space-y-2'>
          {sortedByCount.map((entry) => {
            const color = MEMBER_COLORS[entry.colorIndex % MEMBER_COLORS.length]
            return (
              <div
                key={entry.member.userId}
                className='border-line flex items-center justify-between rounded-xl border px-4 py-2.5'
              >
                <div className='flex items-center gap-3'>
                  <span
                    className={`h-2 w-2 rounded-full ${color.bg}`}
                    aria-hidden
                  />
                  <span className={`font-display text-base ${color.text}`}>{getMemberFirstName(entry.member.userId, state.groupMembers)}</span>
                </div>
                <span className='font-display text-2xl'>{entry.count}</span>
              </div>
            )
          })}
        </section>
      }

      <h2 className='text-ink-faint mt-8 text-xs'>{t(locale, 'scoreboard.lastStreaks')}</h2>

      {streaks.length === 0 ?
        <ScoreboardEmpty locale={locale} />
      : <ul className='divide-line mt-1 divide-y'>
          {orderedStreaks.map((s, i) => {
            const color = getMemberColor(s.who, state.groupMembers)
            return (
              <li
                key={`${s.who}-${s.startTs}-${i}`}
                className='flex items-baseline justify-between py-2.5'
              >
                <span className='font-display text-sm'>
                  <span className={color.text}>{getMemberFirstName(s.who, state.groupMembers)}</span> · {s.count}
                </span>
                <span className='text-ink-faint font-mono text-[11px]'>{timeFmt.format(new Date(s.endTs))}</span>
              </li>
            )
          })}
        </ul>
      }
    </div>
  )
}

// ─── World tab ──────────────────────────────────────────────────────────────────

function WorldTab({ initialRanking, locale }: { initialRanking: WorldRankingResult; locale: Locale }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reduce = useReducedMotion()
  const rawWindow = searchParams.get('window')
  const windowSel: WorldRankingWindow = rawWindow === 'week' ? 'week' : 'all'
  const [committedWindow, setCommittedWindow] = useState<WorldRankingWindow>(windowSel)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [data, setData] = useState(initialRanking)
  const [, startTransition] = useTransition()
  const listRef = useRef<HTMLDivElement>(null)
  const reqIdRef = useRef(0)

  function selectWindow(w: WorldRankingWindow) {
    if (w === windowSel) return
    const prevIndex = WINDOWS.findIndex((win) => win.id === windowSel)
    const nextIndex = WINDOWS.findIndex((win) => win.id === w)
    setDirection(nextIndex > prevIndex ? 1 : -1)
    const params = new URLSearchParams(searchParams.toString())
    params.set('window', w)
    router.replace(`/scoreboard?${params}`, { scroll: false })
    const id = ++reqIdRef.current
    startTransition(async () => {
      const fresh = await getWorldRanking({ window: w })
      if (id !== reqIdRef.current) return
      setData(fresh)
      setCommittedWindow(w)
    })
  }

  function jumpTo(groupId: string) {
    const root = listRef.current
    if (!root) return
    const target = root.querySelector(`[data-group-id="${CSS.escape(groupId)}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const top = data.rows.slice(0, 3)
  const rest = data.rows.slice(3)

  return (
    <div
      ref={listRef}
      className='flex flex-col pb-[max(env(safe-area-inset-bottom),1rem)]'
    >
      <p className='font-display text-ink-soft text-sm italic'>{t(locale, 'world.subtitle')}</p>

      <div className='mt-3'>
        <Tabs
          items={WINDOWS}
          activeId={windowSel}
          locale={locale}
          layoutId='world-window'
          onSelect={selectWindow}
        />
      </div>

      <AnimatePresence
        mode='popLayout'
        initial={false}
      >
        <motion.div
          key={committedWindow}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * MOTION_OFFSET.tab }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -direction * MOTION_OFFSET.tab }}
          transition={MOTION_TRANSITION.tab}
        >
          {data.userGroupRanks.length > 0 && (
            <UserGroupsJumpBar
              entries={data.userGroupRanks}
              locale={locale}
              onJump={jumpTo}
            />
          )}
          {data.rows.length === 0 ?
            <WorldEmpty locale={locale} />
          : <>
              <span className='text-ink-faint mt-3 block text-xs'>
                {data.rows.length} {t(locale, 'world.groups')}
              </span>
              {top.length > 0 && (
                <Podium
                  rows={top}
                  locale={locale}
                />
              )}
              {rest.length > 0 && (
                <RestList
                  rows={rest}
                  locale={locale}
                />
              )}
            </>
          }
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Shared sub-components ──────────────────────────────────────────────────────

function Score({
  name,
  image,
  count,
  longest,
  highlight,
  align,
  colorIndex,
  locale
}: {
  name: string
  image: string | null
  count: number
  longest: number
  highlight: boolean
  align: 'left' | 'right'
  colorIndex: number
  locale: Locale
}) {
  const color = MEMBER_COLORS[colorIndex % MEMBER_COLORS.length]
  return (
    <div className={`flex flex-col gap-2 ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
      {image ?
        <Image
          src={resolveAvatarUrl(image) ?? image}
          alt=''
          width={48}
          height={48}
          unoptimized
          referrerPolicy='no-referrer'
          className='h-12 w-12 rounded-full object-cover'
        />
      : <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color.bgSoft}`}>
          <span className={`font-display text-2xl ${color.text}`}>{name.slice(0, 1).toUpperCase()}</span>
        </div>
      }
      <span className='text-ink-faint text-xs'>{name}</span>
      <span className={`font-display text-[44px] leading-none tracking-tight ${highlight ? color.text : 'text-ink'}`}>{count}</span>
      <span className='text-ink-faint text-xs'>
        {t(locale, 'scoreboard.longest')} · {longest}
      </span>
    </div>
  )
}

function Podium({ rows, locale }: { rows: WorldRankingRowDTO[]; locale: Locale }) {
  return (
    <ol className='mt-3 flex flex-col gap-2.5'>
      {rows.map((row, i) => {
        const color = MEMBER_COLORS[i % MEMBER_COLORS.length]
        const tilt = i % 2 === 0 ? 'rotate-[-0.3deg]' : 'rotate-[0.3deg]'
        return (
          <li
            key={row.groupId}
            data-group-id={row.groupId}
            className={`relative ${color.bgSoft} ${color.border} flex items-center gap-3 rounded-xl border px-4 py-3 ${tilt}`}
          >
            <span
              aria-hidden
              className='text-2xl leading-none'
            >
              {MEDALS[i]}
            </span>
            <div className='min-w-0 flex-1'>
              <p className={`font-display truncate text-lg leading-tight ${color.text}`}>{row.displayName}</p>
              {row.isMember && <span className='font-display text-ink-soft text-[11px] italic'>{t(locale, 'world.your')}</span>}
            </div>
            <span className='font-mono text-2xl tabular-nums'>{row.score}</span>
          </li>
        )
      })}
    </ol>
  )
}

function RestList({ rows, locale }: { rows: WorldRankingRowDTO[]; locale: Locale }) {
  return (
    <ol className='divide-line mt-3 divide-y'>
      {rows.map((row) => (
        <li
          key={row.groupId}
          data-group-id={row.groupId}
          className={`flex items-baseline gap-3 py-2.5 ${row.isMember ? 'bg-paper -mx-2 rounded-md px-2' : ''}`}
        >
          <span className='text-ink-faint w-7 text-right font-mono text-xs tabular-nums'>{row.rank}</span>
          <span className='font-display flex-1 truncate text-base'>{row.displayName}</span>
          {row.isMember && <span className='font-display text-ink-soft text-[11px] italic'>{t(locale, 'world.your')}</span>}
          <span className='font-mono text-base tabular-nums'>{row.score}</span>
        </li>
      ))}
    </ol>
  )
}

function UserGroupsJumpBar({
  entries,
  locale,
  onJump
}: {
  entries: WorldRankingResult['userGroupRanks']
  locale: Locale
  onJump: (groupId: string) => void
}) {
  return (
    <div className='mt-4'>
      <span className='text-ink-faint mb-1.5 block text-xs'>{t(locale, 'world.yourGroups')}</span>
      <div className='-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 whitespace-nowrap'>
        {entries.map((e, i) => {
          const color = MEMBER_COLORS[i % MEMBER_COLORS.length]
          return (
            <motion.button
              type='button'
              key={e.groupId}
              onClick={() => onJump(e.groupId)}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className='border-line bg-paper inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1'
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${color.bg}`}
              />
              <span className='text-ink-faint font-mono text-[11px] tabular-nums'>#{e.rank}</span>
              <span className='font-display text-sm'>{e.displayName}</span>
              <span className='text-ink-soft font-mono text-xs tabular-nums'>· {e.score}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function ScoreboardEmpty({ locale }: { locale: Locale }) {
  return (
    <div className='flex flex-col items-center pt-8 text-center'>
      <div className='relative w-[55%] max-w-50'>
        <Image
          src='/empty-scoreboard-light.png'
          alt=''
          aria-hidden
          width={400}
          height={400}
          unoptimized
          className='theme-light-only h-auto w-full select-none'
          draggable={false}
        />
        <Image
          src='/empty-scoreboard-dark.png'
          alt=''
          aria-hidden
          width={400}
          height={400}
          unoptimized
          className='theme-dark-only h-auto w-full select-none'
          draggable={false}
        />
      </div>
      <p className='font-display text-ink-soft mt-4 text-sm italic'>{t(locale, 'scoreboard.empty')}</p>
    </div>
  )
}

function WorldEmpty({ locale }: { locale: Locale }) {
  return (
    <div className='mt-10 flex flex-col items-center text-center'>
      <div className='relative w-[58%] max-w-55'>
        <Image
          src='/empty-ranking-light.png'
          alt=''
          aria-hidden
          width={440}
          height={440}
          unoptimized
          className='theme-light-only h-auto w-full select-none'
          draggable={false}
        />
        <Image
          src='/empty-ranking-dark.png'
          alt=''
          aria-hidden
          width={440}
          height={440}
          unoptimized
          className='theme-dark-only h-auto w-full select-none'
          draggable={false}
        />
      </div>
      <p className='font-display text-ink-soft mt-5 text-base'>{t(locale, 'world.empty.title')}</p>
      <p className='text-ink-faint mt-1.5 text-xs'>{t(locale, 'world.empty.subtitle')}</p>
    </div>
  )
}
