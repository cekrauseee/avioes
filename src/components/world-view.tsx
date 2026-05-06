'use client'

import Image from 'next/image'
import { useRef, useState, useTransition } from 'react'
import { getWorldRanking, type WorldRankingResult, type WorldRankingRowDTO, type WorldRankingWindow } from '../actions'
import { t } from '../lib/i18n'
import { selectLocale, useOfflineState } from '../lib/offline-store'
import { MEMBER_COLORS, type Locale } from '../lib/types'
import { AppShell } from './app-shell'
import { SyncStatus } from './sync-status'
import { ThemeToggle } from './theme-toggle'
import { ToolbarTabs, type ToolbarTabItem } from './toolbar-tabs'

const WINDOWS: ToolbarTabItem<WorldRankingWindow>[] = [
  { id: 'all', labelKey: 'world.window.all' },
  { id: 'week', labelKey: 'world.window.week' }
]

const MEDALS = ['🥇', '🥈', '🥉']

export function WorldView({ initial }: { initial: WorldRankingResult }) {
  const state = useOfflineState()
  const locale = selectLocale(state)
  const [data, setData] = useState(initial)
  const [windowSel, setWindowSel] = useState<WorldRankingWindow>(initial.window)
  const [pending, startTransition] = useTransition()
  const listRef = useRef<HTMLDivElement>(null)
  const reqIdRef = useRef(0)

  function selectWindow(w: WorldRankingWindow) {
    if (w === windowSel) return
    setWindowSel(w)
    const id = ++reqIdRef.current
    startTransition(async () => {
      const fresh = await getWorldRanking({ window: w })
      if (id !== reqIdRef.current) return
      setData(fresh)
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
    <AppShell>
      <div className='flex min-h-0 flex-1 flex-col'>
        <header className='px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-2'>
          <div className='flex items-center justify-between'>
            <h1 className='font-display text-3xl tracking-tight'>{t(locale, 'world.title')}</h1>
            <div className='flex items-center gap-2'>
              <SyncStatus />
              <span className='text-ink-faint text-xs'>
                {data.rows.length} {t(locale, 'world.groups')}
              </span>
              <ThemeToggle />
            </div>
          </div>
          <p className='font-display text-ink-soft mt-1 text-sm italic'>{t(locale, 'world.subtitle')}</p>

          <div className='-mx-5 mt-3'>
            <ToolbarTabs
              items={WINDOWS}
              activeId={windowSel}
              accentClass='bg-sage'
              locale={locale}
              indicatorLayoutId='world-window'
              onSelect={selectWindow}
            />
          </div>
        </header>

        <div
          ref={listRef}
          className='scroll-area fade-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-8'
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
          : <div className={`transition-opacity duration-150 ${pending ? 'opacity-60' : 'opacity-100'}`}>
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
            </div>
          }
        </div>
      </div>
    </AppShell>
  )
}

function Podium({ rows, locale }: { rows: WorldRankingRowDTO[]; locale: Locale }) {
  return (
    <ol className='mt-4 flex flex-col gap-2.5'>
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
    <div className='bg-bg/85 sticky top-0 z-10 -mx-5 px-5 pt-2 pb-2 backdrop-blur'>
      <span className='text-ink-faint mb-1.5 block text-[10px] tracking-[0.12em] uppercase'>{t(locale, 'world.yourGroups')}</span>
      <div className='-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 whitespace-nowrap'>
        {entries.map((e, i) => {
          const color = MEMBER_COLORS[i % MEMBER_COLORS.length]
          return (
            <button
              type='button'
              key={e.groupId}
              onClick={() => onJump(e.groupId)}
              className='border-line bg-paper inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 transition-colors active:scale-95'
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${color.bg}`}
              />
              <span className='text-ink-faint font-mono text-[11px] tabular-nums'>#{e.rank}</span>
              <span className='font-display text-sm'>{e.displayName}</span>
              <span className='text-ink-soft font-mono text-xs tabular-nums'>· {e.score}</span>
            </button>
          )
        })}
      </div>
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
