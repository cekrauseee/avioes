import 'server-only'

import { and, desc, eq, sql } from 'drizzle-orm'
import { db, events, preferences } from './db'
import type { AirplaneEvent, Identity, QueueOp, Theme } from './types'

export async function readEvents(): Promise<AirplaneEvent[]> {
  return db.select({ who: events.who, ts: events.ts }).from(events).orderBy(events.ts)
}

export async function addEvent(who: Identity): Promise<void> {
  await db.insert(events).values({ who, ts: Date.now() })
}

export async function deleteLastEvent(who: Identity): Promise<void> {
  const last = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.who, who))
    .orderBy(desc(events.ts), desc(events.id))
    .limit(1)
  if (last.length === 0) return
  await db.delete(events).where(and(eq(events.id, last[0].id), eq(events.who, who)))
}

export async function readTheme(who: Identity | null): Promise<Theme> {
  if (!who) return 'system'
  const row = await db.select({ theme: preferences.theme }).from(preferences).where(eq(preferences.who, who)).limit(1)
  return row[0]?.theme ?? 'system'
}

export async function writeTheme(who: Identity, theme: Theme): Promise<void> {
  await db
    .insert(preferences)
    .values({ who, theme })
    .onConflictDoUpdate({ target: preferences.who, set: { theme } })
}

export async function applyEvents(who: Identity, ops: QueueOp[]): Promise<string[]> {
  const acked: string[] = []
  for (const op of ops) {
    if (op.who !== who) continue
    try {
      if (op.op === 'add') {
        await db.insert(events).values({ who: op.who, ts: op.ts })
      } else {
        await deleteLastEvent(op.who)
      }
      acked.push(op.id)
    } catch {
      break
    }
  }
  return acked
}

export async function counts(): Promise<Record<Identity, number>> {
  const rows = await db
    .select({ who: events.who, n: sql<number>`count(*)::int` })
    .from(events)
    .groupBy(events.who)
  const out: Record<Identity, number> = { henrique: 0, pietra: 0 }
  for (const r of rows) out[r.who] = r.n
  return out
}
