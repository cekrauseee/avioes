import type { AirplaneEvent, Identity, Streak } from '@airplanes/types'

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
  const t: Record<string, number> = {}
  for (const e of events) {
    t[e.who] = (t[e.who] ?? 0) + 1
  }
  return t
}
