'use client'

import Image from 'next/image'
import { DATE_LOCALE, t } from '../lib/i18n'
import { selectEvents, selectLocale, useOfflineState } from '../lib/offline-store'
import { computeStreaks } from '../lib/streaks'
import { getMemberColor, getMemberName, type Locale } from '../lib/types'
import { AppShell } from './app-shell'
import { Onboarding } from './onboarding'
import { SyncStatus } from './sync-status'
import { ThemeToggle } from './theme-toggle'

function dayFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], { day: '2-digit', month: 'long' })
}

function timeFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], { hour: '2-digit', minute: '2-digit' })
}

export function DiaryView() {
  const state = useOfflineState()
  const locale = selectLocale(state)
  if (!state.identity || !state.activeGroupId) return <Onboarding />

  const merged = selectEvents(state)
  const streaks = computeStreaks(merged).reverse()
  const dayFmt = dayFormatter(locale)
  const timeFmt = timeFormatter(locale)

  return (
    <AppShell>
      <div className='flex min-h-0 flex-1 flex-col'>
        <header className='px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-3'>
          <div className='flex items-center justify-between'>
            <h1 className='font-display text-3xl tracking-tight'>{t(locale, 'diary.title')}</h1>
            <div className='flex items-center gap-2'>
              <SyncStatus />
              <span className='text-ink-faint text-xs'>
                {merged.length} {t(locale, 'diary.airplanes')}
              </span>
              <ThemeToggle />
            </div>
          </div>
          <p className='font-display text-ink-soft mt-1 text-sm italic'>{t(locale, 'diary.subtitle')}</p>
        </header>

        <div className='scroll-area fade-scroll min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-8'>
          {streaks.length === 0 ?
            <Empty locale={locale} />
          : <ol className='relative space-y-4 pl-5'>
              <span
                aria-hidden
                className='dotted-line absolute top-2 bottom-2 left-[5px] w-px'
              />
              {streaks.map((s, i) => {
                const color = getMemberColor(s.who, state.groupMembers)
                const label = getMemberName(s.who, state.groupMembers)
                return (
                  <li
                    key={`${s.who}-${s.startTs}-${i}`}
                    className='relative'
                  >
                    <span
                      aria-hidden
                      className={`absolute top-2 -left-[18px] h-2 w-2 rounded-full ${color.bg}`}
                    />
                    <article className={`bg-paper rounded-xl p-3 ${i % 2 === 0 ? 'rotate-[-0.3deg]' : 'rotate-[0.3deg]'}`}>
                      <p className='font-display text-base leading-snug'>
                        <span className={color.text}>{label}</span> {t(locale, 'diary.saw')} <span className='font-mono text-sm'>{s.count}</span>{' '}
                        {s.count === 1 ? t(locale, 'diary.airplane') : t(locale, 'diary.airplanesInSequence')}.
                      </p>
                      <p className='text-ink-faint mt-1.5 font-mono text-[11px]'>
                        {dayFmt.format(new Date(s.startTs))} · {timeFmt.format(new Date(s.startTs))}
                        {s.count > 1 ? ` – ${timeFmt.format(new Date(s.endTs))}` : ''}
                      </p>
                    </article>
                  </li>
                )
              })}
            </ol>
          }
        </div>
      </div>
    </AppShell>
  )
}

function Empty({ locale }: { locale: Locale }) {
  return (
    <div className='mt-8 flex flex-col items-center text-center'>
      <div className='relative w-[58%] max-w-55'>
        <Image
          src='/empty-diary-light.png'
          alt=''
          aria-hidden
          width={440}
          height={440}
          unoptimized
          className='theme-light-only h-auto w-full select-none'
          draggable={false}
        />
        <Image
          src='/empty-diary-dark.png'
          alt=''
          aria-hidden
          width={440}
          height={440}
          unoptimized
          className='theme-dark-only h-auto w-full select-none'
          draggable={false}
        />
      </div>
      <p className='font-display text-ink-soft mt-5 text-base'>{t(locale, 'diary.empty')}</p>
      <p className='text-ink-faint mt-1.5 text-xs'>{t(locale, 'diary.emptyHint')}</p>
    </div>
  )
}
