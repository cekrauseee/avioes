import 'server-only'

import { and, eq, sql } from 'drizzle-orm'
import { db, events, preferences, processedOps } from './db'
import type { AirplaneEvent, Identity, Palette, PendingOp, Theme } from './types'

export async function readEvents(): Promise<AirplaneEvent[]> {
  const rows = await db.select({ id: events.id, clientId: events.clientId, who: events.who, ts: events.ts }).from(events).orderBy(events.ts, events.id)
  return rows.map((row) => ({
    id: row.clientId ?? `server:${row.id}`,
    who: row.who,
    ts: row.ts
  }))
}

export async function readTheme(who: Identity | null): Promise<Theme> {
  if (!who) return 'system'
  const row = await db.select({ theme: preferences.theme }).from(preferences).where(eq(preferences.who, who)).limit(1)
  return row[0]?.theme ?? 'system'
}

export async function readPalette(who: Identity | null): Promise<Palette> {
  if (!who) return 'default'
  const row = await db.select({ palette: preferences.palette }).from(preferences).where(eq(preferences.who, who)).limit(1)
  return row[0]?.palette ?? 'default'
}

export async function writeTheme(who: Identity, theme: Theme): Promise<void> {
  await db.insert(preferences).values({ who, theme }).onConflictDoUpdate({ target: preferences.who, set: { theme } })
}

export async function applyOps(ops: PendingOp[], who: Identity): Promise<string[]> {
  const settled: string[] = []
  for (const op of ops) {
    try {
      await db.transaction(async (tx) => {
        // Shape-valid ops settle once to avoid replay loops; mutations remain scoped by the cookie identity.
        const inserted = await tx.insert(processedOps).values({ id: op.id }).onConflictDoNothing().returning({ id: processedOps.id })
        if (inserted.length === 0) return
        if (op.kind === 'add-event') {
          if (op.event.who !== who) return
          await tx.insert(events).values({ clientId: op.event.id, who, ts: op.event.ts }).onConflictDoNothing()
        } else if (op.kind === 'delete-event') {
          const serverId = parseServerEventId(op.eventId)
          if (serverId !== null) {
            await tx.delete(events).where(and(eq(events.id, serverId), eq(events.who, who)))
          } else {
            await tx.delete(events).where(and(eq(events.clientId, op.eventId), eq(events.who, who)))
          }
        } else if (op.kind === 'set-theme') {
          await tx
            .insert(preferences)
            .values({ who, theme: op.theme })
            .onConflictDoUpdate({ target: preferences.who, set: { theme: op.theme } })
        } else if (op.kind === 'set-palette') {
          await tx
            .insert(preferences)
            .values({ who, palette: op.palette })
            .onConflictDoUpdate({ target: preferences.who, set: { palette: op.palette } })
        }
      })
      settled.push(op.id)
    } catch {
      break
    }
  }
  return settled
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

function parseServerEventId(id: string): number | null {
  if (!id.startsWith('server:')) return null
  const n = Number(id.slice('server:'.length))
  return Number.isInteger(n) && n > 0 ? n : null
}
