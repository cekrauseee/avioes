import { totals } from './streaks'
import type { AirplaneEvent, GroupMember, Identity, Locale, Palette, PendingOp, Theme } from './types'

export type AddEventOp = Extract<PendingOp, { kind: 'add-event' }>
export type DeleteEventOp = Extract<PendingOp, { kind: 'delete-event' }>
export type ThemeOp = Extract<PendingOp, { kind: 'set-theme' }>
export type PaletteOp = Extract<PendingOp, { kind: 'set-palette' }>
export type LocaleOp = Extract<PendingOp, { kind: 'set-locale' }>

export type OfflineSnapshot = {
  identity: Identity | null
  activeGroupId: string | null
  groupMembers: GroupMember[]
  baseEvents: AirplaneEvent[]
  baseTheme: Theme
  basePalette: Palette
  baseLocale: Locale
  pendingOps: PendingOp[]
}

export type SyncSnapshot = {
  identity: Identity | null
  activeGroupId: string | null
  groupMembers: GroupMember[]
  events: AirplaneEvent[]
  theme: Theme
  palette: Palette
  locale: Locale
  settled: string[]
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

export function visibleTotals(snapshot: OfflineSnapshot): Record<string, number> {
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

export function projectPalette(basePalette: Palette, pendingOps: readonly PendingOp[]): Palette {
  let palette = basePalette
  for (const op of pendingOps) {
    if (op.kind === 'set-palette') palette = op.palette
  }
  return palette
}

export function makePaletteOp(palette: Palette, id: string): PaletteOp {
  return { id, kind: 'set-palette', palette }
}

export function projectLocale(baseLocale: Locale, pendingOps: readonly PendingOp[]): Locale {
  let locale = baseLocale
  for (const op of pendingOps) {
    if (op.kind === 'set-locale') locale = op.locale
  }
  return locale
}

export function makeLocaleOp(locale: Locale, id: string): LocaleOp {
  return { id, kind: 'set-locale', locale }
}

export function settleSnapshot(snapshot: OfflineSnapshot, sync: SyncSnapshot): OfflineSnapshot {
  const settled = new Set(sync.settled)
  return {
    identity: sync.identity,
    activeGroupId: sync.activeGroupId,
    groupMembers: sync.groupMembers,
    baseEvents: sync.events,
    baseTheme: sync.theme,
    basePalette: sync.palette,
    baseLocale: sync.locale,
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
