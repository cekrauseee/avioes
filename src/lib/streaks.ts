import type { AirplaneEvent, Identity, Streak } from './types'

export function computeStreaks(events: AirplaneEvent[]): Streak[] {
  const streaks: Streak[] = []
  for (const e of events) {
    const last = streaks[streaks.length - 1]
    if (last && last.who === e.who) {
      last.count += 1
      last.endTs = e.ts
    } else {
      streaks.push({ who: e.who, count: 1, startTs: e.ts, endTs: e.ts })
    }
  }
  return streaks
}

export function totals(events: AirplaneEvent[]): Record<Identity, number> {
  const t: Record<Identity, number> = { henrique: 0, pietra: 0 }
  for (const e of events) t[e.who] += 1
  return t
}
