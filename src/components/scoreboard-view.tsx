'use client'

import Image from 'next/image'
import { DATE_LOCALE, t } from '../lib/i18n'
import { selectEvents, selectLocale, useOfflineState } from '../lib/offline-store'
import { computeStreaks, totals } from '../lib/streaks'
import { getMemberColor, getMemberName, MEMBER_COLORS, type Locale } from '../lib/types'
import { AppShell } from './app-shell'
import { Onboarding } from './onboarding'
import { SyncStatus } from './sync-status'
import { ThemeToggle } from './theme-toggle'

export function ScoreboardView() {
  const state = useOfflineState()
  const locale = selectLocale(state)
  if (!state.identity || !state.activeGroupId) return <Onboarding />

  const merged = selectEvents(state)
  const tt = totals(merged)
  const streaks = computeStreaks(merged)

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
    <AppShell>
      <div className='flex h-full flex-col'>
        <header className='px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-2'>
          <div className='flex items-center justify-between'>
            <h1 className='font-display text-3xl tracking-tight'>{t(locale, 'scoreboard.title')}</h1>
            <div className='flex items-center gap-2'>
              <SyncStatus />
              <span className='text-ink-faint text-xs'>{merged.length} {t(locale, 'scoreboard.total')}</span>
              <ThemeToggle />
            </div>
          </div>
          <p className='font-display text-ink-soft mt-1 text-sm italic'>
            {leader ?
              `${getMemberName(leader.member.userId, state.groupMembers)} ${t(locale, 'scoreboard.isAhead')}`
            : t(locale, 'scoreboard.tied')}
          </p>

          {/* Scores: show up to 2 members side by side, more as list */}
          {memberEntries.length <= 2 ?
            <section className='relative mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-2'>
              {memberEntries[0] && (
                <Score
                  name={getMemberName(memberEntries[0].member.userId, state.groupMembers)}
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
                    name={getMemberName(memberEntries[1].member.userId, state.groupMembers)}
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
                      <span className={`h-2 w-2 rounded-full ${color.bg}`} aria-hidden />
                      <span className={`font-display text-base ${color.text}`}>
                        {getMemberName(entry.member.userId, state.groupMembers)}
                      </span>
                    </div>
                    <span className='font-display text-2xl'>{entry.count}</span>
                  </div>
                )
              })}
            </section>
          }

          <h2 className='text-ink-faint mt-8 text-xs'>{t(locale, 'scoreboard.lastStreaks')}</h2>
        </header>

        <div className='scroll-area fade-scroll flex-1 overflow-y-auto px-5 pb-8'>
          {streaks.length === 0 ?
            <ScoreboardEmpty locale={locale} />
          : <ul className='divide-line divide-y'>
              {streaks
                .slice(-8)
                .reverse()
                .map((s, i) => {
                  const color = getMemberColor(s.who, state.groupMembers)
                  return (
                    <li
                      key={`${s.who}-${s.startTs}-${i}`}
                      className='flex items-baseline justify-between py-2.5'
                    >
                      <span className='font-display text-sm'>
                        <span className={color.text}>{getMemberName(s.who, state.groupMembers)}</span> · {s.count}
                      </span>
                      <span className='text-ink-faint font-mono text-[11px]'>{timeFmt.format(new Date(s.endTs))}</span>
                    </li>
                  )
                })}
            </ul>
          }
        </div>
      </div>
    </AppShell>
  )
}

function Score({
  name,
  count,
  longest,
  highlight,
  align,
  colorIndex,
  locale
}: {
  name: string
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
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color.bgSoft}`}>
        <span className={`font-display text-2xl ${color.text}`}>{name.slice(0, 1).toUpperCase()}</span>
      </div>
      <span className='text-ink-faint text-xs'>{name}</span>
      <span className={`font-display text-[44px] leading-none tracking-tight ${highlight ? color.text : 'text-ink'}`}>{count}</span>
      <span className='text-ink-faint text-xs'>{t(locale, 'scoreboard.longest')} · {longest}</span>
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
