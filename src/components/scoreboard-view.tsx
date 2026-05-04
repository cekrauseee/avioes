'use client'

import Image from 'next/image'
import { DATE_LOCALE, t } from '../lib/i18n'
import { selectEvents, selectLocale, useOfflineState } from '../lib/offline-store'
import { computeStreaks, totals } from '../lib/streaks'
import { IDENTITIES, type Identity, type Locale } from '../lib/types'
import { AppShell } from './app-shell'
import { Onboarding } from './onboarding'
import { SyncStatus } from './sync-status'
import { ThemeToggle } from './theme-toggle'

export function ScoreboardView() {
  const state = useOfflineState()
  const locale = selectLocale(state)
  if (!state.identity) return <Onboarding />

  const merged = selectEvents(state)
  const tt = totals(merged)
  const streaks = computeStreaks(merged)
  const longest = streaks.reduce<{ henrique: number; pietra: number }>(
    (acc, s) => {
      if (s.count > acc[s.who]) acc[s.who] = s.count
      return acc
    },
    { henrique: 0, pietra: 0 }
  )
  const leader: Identity | null =
    tt.henrique === tt.pietra ? null
    : tt.henrique > tt.pietra ? 'henrique'
    : 'pietra'

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
            {leader ? `${IDENTITIES[leader].label} ${t(locale, 'scoreboard.isAhead')}` : t(locale, 'scoreboard.tied')}
          </p>

          <section className='relative mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-2'>
            <Score
              id='henrique'
              count={tt.henrique}
              longest={longest.henrique}
              highlight={leader === 'henrique'}
              align='left'
              locale={locale}
            />
            <span className='font-display text-ink-faint rotate-[-8deg] text-2xl italic'>vs</span>
            <Score
              id='pietra'
              count={tt.pietra}
              longest={longest.pietra}
              highlight={leader === 'pietra'}
              align='right'
              locale={locale}
            />
          </section>

          <h2 className='text-ink-faint mt-8 text-xs'>{t(locale, 'scoreboard.lastStreaks')}</h2>
        </header>

        <div className='scroll-area fade-scroll flex-1 overflow-y-auto px-5 pb-8'>
          {streaks.length === 0 ?
            <ScoreboardEmpty locale={locale} />
          : <ul className='divide-line divide-y'>
              {streaks
                .slice(-8)
                .reverse()
                .map((s, i) => (
                  <li
                    key={`${s.who}-${s.startTs}-${i}`}
                    className='flex items-baseline justify-between py-2.5'
                  >
                    <span className='font-display text-sm'>
                      <span className={IDENTITIES[s.who].text}>{IDENTITIES[s.who].label}</span> · {s.count}
                    </span>
                    <span className='text-ink-faint font-mono text-[11px]'>{timeFmt.format(new Date(s.endTs))}</span>
                  </li>
                ))}
            </ul>
          }
        </div>
      </div>
    </AppShell>
  )
}

function Score({ id, count, longest, highlight, align, locale }: { id: Identity; count: number; longest: number; highlight: boolean; align: 'left' | 'right'; locale: Locale }) {
  return (
    <div className={`flex flex-col gap-2 ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
      <div className='relative w-14'>
        <Image
          src={`/avatar-${id}-light.png`}
          alt=''
          aria-hidden
          width={224}
          height={224}
          unoptimized
          className='theme-light-only h-auto w-full select-none'
          draggable={false}
        />
        <Image
          src={`/avatar-${id}-dark.png`}
          alt=''
          aria-hidden
          width={224}
          height={224}
          unoptimized
          className='theme-dark-only h-auto w-full select-none'
          draggable={false}
        />
      </div>
      <span className='text-ink-faint text-xs'>{IDENTITIES[id].label}</span>
      <span className={`font-display text-[44px] leading-none tracking-tight ${highlight ? IDENTITIES[id].text : 'text-ink'}`}>{count}</span>
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
