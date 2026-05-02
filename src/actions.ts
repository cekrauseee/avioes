'use server'

import { deleteIdentity, readIdentity, writeIdentity } from './lib/cookies'
import type { SyncSnapshot } from './lib/offline-model'
import { applyOps, readEvents, readTheme } from './lib/store'
import type { Identity, PendingOp } from './lib/types'

const MAX_SYNC_OPS = 250
const MAX_FUTURE_TS_MS = 5 * 60 * 1000

export async function setIdentity(who: Identity): Promise<SyncSnapshot> {
  if (who !== 'henrique' && who !== 'pietra') return emptySnapshot(null, [])
  await writeIdentity(who)
  return snapshotFor(who, [])
}

export async function clearIdentity() {
  await deleteIdentity()
}

function isIdentity(v: unknown): v is Identity {
  return v === 'henrique' || v === 'pietra'
}

function opId(op: unknown): string | null {
  return typeof op === 'object' && op !== null && typeof (op as { id?: unknown }).id === 'string' ? (op as { id: string }).id : null
}

function isPendingOp(op: unknown): op is PendingOp {
  if (typeof op !== 'object' || op === null) return false
  const item = op as { id?: unknown; kind?: unknown; event?: unknown; eventId?: unknown; theme?: unknown }
  if (typeof item.id !== 'string') return false
  if (item.kind === 'add-event') {
    const event = item.event as { id?: unknown; who?: unknown; ts?: unknown } | null
    return (
      typeof event === 'object' &&
      event !== null &&
      typeof event.id === 'string' &&
      isIdentity(event.who) &&
      typeof event.ts === 'number' &&
      Number.isFinite(event.ts) &&
      event.ts > 0 &&
      event.ts <= Date.now() + MAX_FUTURE_TS_MS
    )
  }
  if (item.kind === 'delete-event') return typeof item.eventId === 'string'
  return item.kind === 'set-theme' && (item.theme === 'light' || item.theme === 'dark' || item.theme === 'system')
}

export async function bootstrapState(): Promise<SyncSnapshot> {
  const who = await readIdentity()
  if (!who) return emptySnapshot(null, [])
  return snapshotFor(who, [])
}

export async function syncOps(ops: unknown[]): Promise<SyncSnapshot> {
  const who = await readIdentity()
  if (!who) return emptySnapshot(null, [])
  const validOps: PendingOp[] = []
  const rejected: string[] = []
  const incoming = Array.isArray(ops) ? ops : []
  for (const op of incoming.slice(0, MAX_SYNC_OPS)) {
    if (isPendingOp(op)) validOps.push(op)
    else {
      const id = opId(op)
      if (id) rejected.push(id)
    }
  }
  const applied = validOps.length > 0 ? await applyOps(validOps, who) : []
  return snapshotFor(who, [...rejected, ...applied])
}

function emptySnapshot(identity: Identity | null, settled: string[]): SyncSnapshot {
  return { identity, events: [], theme: 'system', settled }
}

async function snapshotFor(identity: Identity, settled: string[]): Promise<SyncSnapshot> {
  const [events, theme] = await Promise.all([readEvents(), readTheme(identity)])
  return { identity, events, theme, settled }
}
