import { redirect } from 'next/navigation'
import { AppShell } from '../../components/app-shell'
import { Placeholder } from '../../components/placeholder'
import { ThemeToggle } from '../../components/theme-toggle'
import { readEvents, readIdentity, readTheme } from '../../lib/cookies'
import { computeStreaks, totals } from '../../lib/streaks'
import { IDENTITIES, type Identity } from '../../lib/types'

export default async function PlacarPage() {
  const [who, events, theme] = await Promise.all([readIdentity(), readEvents(), readTheme()])

  if (!who) redirect('/')

  const t = totals(events)
  const streaks = computeStreaks(events)
  const longest = streaks.reduce<{ henrique: number; pietra: number }>(
    (acc, s) => {
      if (s.count > acc[s.who]) acc[s.who] = s.count
      return acc
    },
    { henrique: 0, pietra: 0 }
  )
  const leader: Identity | null =
    t.henrique === t.pietra ? null
    : t.henrique > t.pietra ? 'henrique'
    : 'pietra'

  return (
    <AppShell>
      <div className='flex h-full flex-col'>
        <header className='px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-2'>
          <div className='flex items-center justify-between'>
            <h1 className='font-display text-3xl tracking-tight'>Placar</h1>
            <div className='flex items-center gap-2'>
              <span className='text-ink-faint text-xs'>{events.length} no total</span>
              <ThemeToggle theme={theme} />
            </div>
          </div>
          <p className='font-display text-ink-soft mt-1 text-sm italic'>
            {leader ? `${IDENTITIES[leader].label} está na frente.` : 'Empate técnico no céu.'}
          </p>

          <section className='relative mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-2'>
            <Score
              id='henrique'
              count={t.henrique}
              longest={longest.henrique}
              highlight={leader === 'henrique'}
              align='left'
            />
            <span className='font-display text-ink-faint rotate-[-8deg] text-2xl italic'>vs</span>
            <Score
              id='pietra'
              count={t.pietra}
              longest={longest.pietra}
              highlight={leader === 'pietra'}
              align='right'
            />
          </section>

          <h2 className='text-ink-faint mt-8 text-xs'>últimas sequências</h2>
        </header>

        <div className='scroll-area fade-scroll flex-1 overflow-y-auto px-5 pb-8'>
          <ul className='divide-line divide-y'>
            {streaks.length === 0 && <li className='font-display text-ink-soft py-3 text-sm'>Nada por aqui ainda.</li>}
            {streaks
              .slice(-8)
              .reverse()
              .map((s, i) => (
                <li
                  key={i}
                  className='flex items-baseline justify-between py-2.5'
                >
                  <span className='font-display text-sm'>
                    <span className={IDENTITIES[s.who].text}>{IDENTITIES[s.who].label}</span> · {s.count}
                  </span>
                  <span className='text-ink-faint font-mono text-[11px]'>
                    {new Intl.DateTimeFormat('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(new Date(s.endTs))}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </AppShell>
  )
}

function Score({ id, count, longest, highlight, align }: { id: Identity; count: number; longest: number; highlight: boolean; align: 'left' | 'right' }) {
  const tone = id === 'henrique' ? 'sage' : 'clay'
  return (
    <div className={`flex flex-col gap-2 ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
      <Placeholder
        ratio='1 / 1'
        tone={tone}
        label={IDENTITIES[id].label.toLowerCase()}
        className='w-14'
      />
      <span className='text-ink-faint text-xs'>{IDENTITIES[id].label}</span>
      <span className={`font-display text-[44px] leading-none tracking-tight ${highlight ? IDENTITIES[id].text : 'text-ink'}`}>{count}</span>
      <span className='text-ink-faint text-xs'>maior · {longest}</span>
    </div>
  )
}
