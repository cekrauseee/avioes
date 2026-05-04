import { totals } from './streaks'
import type { AirplaneEvent, Identity, PendingOp, Theme } from './types'

export type AddEventOp = Extract<PendingOp, { kind: 'add-event' }>
export type DeleteEventOp = Extract<PendingOp, { kind: 'delete-event' }>
export type ThemeOp = Extract<PendingOp, { kind: 'set-theme' }>

export type OfflineSnapshot = {
  identity: Identity | null
  baseEvents: AirplaneEvent[]
  baseTheme: Theme
  pendingOps: PendingOp[]
}

export type SyncSnapshot = {
  identity: Identity | null
  events: AirplaneEvent[]
  theme: Theme
  settled: string[]
  introSeen: boolean
}

export function projectEvents(baseEvents: readonly AirplaneEvent[], pendingOps: readonly PendingOp[]): AirplaneEvent[] {
  const events = new Map<string, AirplaneEvent>()
  for (const event of baseEvents) events.set(event.id, event)
  for (const op of pendingOps) {
    if (op.kind === 'add-event') events.set(op.event.id, op.event)
    if (op.kind === 'delete-event') events.delete(op.eventId)
  }
  return [...events.values()].sort(compareEvents)
}

export function projectTheme(baseTheme: Theme, pendingOps: readonly PendingOp[]): Theme {
  let theme = baseTheme
  for (const op of pendingOps) {
    if (op.kind === 'set-theme') theme = op.theme
  }
  return theme
}

export function pendingWriteCount(pendingOps: readonly PendingOp[]): number {
  return pendingOps.length
}

export function visibleTotals(snapshot: OfflineSnapshot): Record<Identity, number> {
  return totals(projectEvents(snapshot.baseEvents, snapshot.pendingOps))
}

export function makeAddEventOp(who: Identity, now: number, id: string): AddEventOp {
  return {
    id: `op:${id}`,
    kind: 'add-event',
    event: { id: `event:${id}`, who, ts: now }
  }
}

export function makeDeleteLatestEventOp(snapshot: OfflineSnapshot, who: Identity, opId: string): DeleteEventOp | null {
  const latest = projectEvents(snapshot.baseEvents, snapshot.pendingOps)
    .filter((event) => event.who === who)
    .at(-1)
  if (!latest) return null
  return { id: opId, kind: 'delete-event', eventId: latest.id }
}

export function makeThemeOp(theme: Theme, id: string): ThemeOp {
  return { id, kind: 'set-theme', theme }
}

export function settleSnapshot(snapshot: OfflineSnapshot, sync: SyncSnapshot): OfflineSnapshot {
  const settled = new Set(sync.settled)
  return {
    identity: sync.identity,
    baseEvents: sync.events,
    baseTheme: sync.theme,
    pendingOps: sync.identity ? snapshot.pendingOps.filter((op) => !settled.has(op.id)) : []
  }
}

function compareEvents(a: AirplaneEvent, b: AirplaneEvent): number {
  if (a.ts !== b.ts) return a.ts - b.ts
  return (
    a.id < b.id ? -1
    : a.id > b.id ? 1
    : 0
  )
}
