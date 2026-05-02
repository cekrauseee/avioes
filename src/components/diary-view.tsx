'use client'

import { mergeQueueIntoEvents, useQueue } from '../lib/offline-queue'
import { computeStreaks } from '../lib/streaks'
import { type AirplaneEvent, IDENTITIES, type Theme } from '../lib/types'
import { SyncStatus } from './sync-status'
import { ThemeToggle } from './theme-toggle'

const dayFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long'
})
const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit'
})

export function DiaryView({ events, theme }: { events: AirplaneEvent[]; theme: Theme }) {
  const queue = useQueue()
  const merged = mergeQueueIntoEvents(events, queue)
  const streaks = computeStreaks(merged).reverse()

  return (
    <div className='flex h-full flex-col'>
      <header className='px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-3'>
        <div className='flex items-center justify-between'>
          <h1 className='font-display text-3xl tracking-tight'>Diário</h1>
          <div className='flex items-center gap-2'>
            <SyncStatus />
            <span className='text-ink-faint text-xs'>{merged.length} aviões</span>
            <ThemeToggle theme={theme} />
          </div>
        </div>
        <p className='font-display text-ink-soft mt-1 text-sm italic'>O céu da gente, em ordem.</p>
      </header>

      <div className='scroll-area fade-scroll flex-1 overflow-y-auto px-5 pt-2 pb-8'>
        {streaks.length === 0 ?
          <Empty />
        : <ol className='relative space-y-4 pl-5'>
            <span
              aria-hidden
              className='dotted-line absolute top-2 bottom-2 left-[5px] w-px'
            />
            {streaks.map((s, i) => (
              <li
                key={i}
                className='relative'
              >
                <span
                  aria-hidden
                  className={`absolute top-2 -left-[18px] h-2 w-2 rounded-full ${IDENTITIES[s.who].bg}`}
                />
                <article className={`bg-paper rounded-xl p-3 ${i % 2 === 0 ? 'rotate-[-0.3deg]' : 'rotate-[0.3deg]'}`}>
                  <p className='font-display text-base leading-snug'>
                    <span className={IDENTITIES[s.who].text}>{IDENTITIES[s.who].label}</span> viu <span className='font-mono text-sm'>{s.count}</span>{' '}
                    {s.count === 1 ? 'avião' : 'aviões em sequência'}.
                  </p>
                  <p className='text-ink-faint mt-1.5 font-mono text-[11px]'>
                    {dayFmt.format(new Date(s.startTs))} · {timeFmt.format(new Date(s.startTs))}
                    {s.count > 1 ? ` – ${timeFmt.format(new Date(s.endTs))}` : ''}
                  </p>
                </article>
              </li>
            ))}
          </ol>
        }
      </div>
    </div>
  )
}

function Empty() {
  return (
    <div className='border-line mt-12 rounded-xl border border-dashed p-6 text-center'>
      <p className='font-display text-ink-soft text-base'>Nenhum avião ainda.</p>
      <p className='text-ink-faint mt-1.5 text-xs'>toque na tela inicial pra começar</p>
    </div>
  )
}
