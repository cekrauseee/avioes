import { makeDeleteLatestEventOp, type OfflineSnapshot } from './offline-model'
import type { AirplaneEvent, Identity, PendingOp, Theme } from './types'

export type PersistedOfflineState = OfflineSnapshot & {
  version: 1
}

export type BootState = {
  identity: Identity | null
  theme: Theme
  introSeen: boolean
}

const DB_NAME = 'airplanes-offline'
const STORE_NAME = 'state'
const DB_VERSION = 1
const SNAPSHOT_KEY = 'snapshot'
const BOOT_KEY = 'ap_boot'
const LEGACY_QUEUE_KEY = 'ap_queue'

let dbPromise: Promise<IDBDatabase> | null = null

export function readBootState(): BootState {
  if (typeof window === 'undefined') return { identity: null, theme: 'system', introSeen: false }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BOOT_KEY) ?? '{}') as Partial<BootState>
    return {
      identity: parsed.identity === 'henrique' || parsed.identity === 'pietra' ? parsed.identity : null,
      theme: parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system' ? parsed.theme : 'system',
      introSeen: parsed.introSeen === true
    }
  } catch {
    return { identity: null, theme: 'system', introSeen: false }
  }
}

export function writeBootState(boot: BootState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(BOOT_KEY, JSON.stringify(boot))
  } catch {}
}

export function clearBootState(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(BOOT_KEY)
  } catch {}
}

export async function readPersistedState(): Promise<PersistedOfflineState | null> {
  const db = await openDb()
  const value = await request<unknown>(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(SNAPSHOT_KEY))
  return isPersistedState(value) ? value : null
}

export async function writePersistedState(snapshot: OfflineSnapshot): Promise<void> {
  const db = await openDb()
  const value: PersistedOfflineState = { version: 1, ...snapshot }
  await request(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, SNAPSHOT_KEY))
}

export async function clearPersistedState(): Promise<void> {
  const db = await openDb()
  await request(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(SNAPSHOT_KEY))
}

export function migrateLegacyQueue(snapshot: OfflineSnapshot): OfflineSnapshot {
  if (!snapshot.identity) return snapshot
  if (typeof window === 'undefined') return snapshot
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(LEGACY_QUEUE_KEY)
  } catch {
    return snapshot
  }
  if (!raw) return snapshot

  let legacy: unknown
  try {
    legacy = JSON.parse(raw)
  } catch {
    removeLegacyQueue()
    return snapshot
  }
  if (!Array.isArray(legacy)) {
    removeLegacyQueue()
    return snapshot
  }

  const existing = new Set(snapshot.pendingOps.map((op) => op.id))
  let next: OfflineSnapshot = { ...snapshot, pendingOps: [...snapshot.pendingOps] }
  const remaining: unknown[] = []

  for (const item of legacy) {
    const op = legacyOp(item)
    if (!op) continue
    if (existing.has(op.id)) continue

    if (op.op === 'add') {
      const migrated: PendingOp = {
        id: op.id,
        kind: 'add-event',
        event: { id: `legacy-event:${op.id}`, who: op.who, ts: op.ts }
      }
      next = { ...next, pendingOps: [...next.pendingOps, migrated] }
      existing.add(op.id)
    } else {
      const migrated = makeDeleteLatestEventOp(next, op.who, op.id)
      if (!migrated) {
        remaining.push(item)
        continue
      }
      next = { ...next, pendingOps: [...next.pendingOps, migrated] }
      existing.add(op.id)
    }
  }

  writeLegacyQueue(remaining)
  return next
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable'))
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
  return dbPromise
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

function isPersistedState(value: unknown): value is PersistedOfflineState {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<PersistedOfflineState>
  return (
    item.version === 1 &&
    isIdentityOrNull(item.identity) &&
    isTheme(item.baseTheme) &&
    Array.isArray(item.baseEvents) &&
    item.baseEvents.every(isEvent) &&
    Array.isArray(item.pendingOps) &&
    item.pendingOps.every(isPendingOp)
  )
}

function isIdentity(value: unknown): value is Identity {
  return value === 'henrique' || value === 'pietra'
}

function isIdentityOrNull(value: unknown): value is Identity | null {
  return value === null || isIdentity(value)
}

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

function isEvent(value: unknown): value is AirplaneEvent {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<AirplaneEvent>
  return typeof item.id === 'string' && isIdentity(item.who) && typeof item.ts === 'number' && Number.isFinite(item.ts) && item.ts > 0
}

function isPendingOp(value: unknown): value is PendingOp {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<PendingOp>
  if (typeof item.id !== 'string') return false
  if (item.kind === 'add-event') return isEvent(item.event)
  if (item.kind === 'delete-event') return typeof item.eventId === 'string'
  return item.kind === 'set-theme' && isTheme(item.theme)
}

type LegacyOp = { id: string; op: 'add'; who: Identity; ts: number } | { id: string; op: 'undo'; who: Identity }

function legacyOp(value: unknown): LegacyOp | null {
  if (typeof value !== 'object' || value === null) return null
  const item = value as { id?: unknown; op?: unknown; who?: unknown; ts?: unknown }
  if (typeof item.id !== 'string' || !isIdentity(item.who)) return null
  if (item.op === 'add' && typeof item.ts === 'number' && Number.isFinite(item.ts) && item.ts > 0) {
    return { id: item.id, op: 'add', who: item.who, ts: item.ts }
  }
  if (item.op === 'undo') return { id: item.id, op: 'undo', who: item.who }
  return null
}

function writeLegacyQueue(remaining: unknown[]): void {
  if (remaining.length === 0) {
    removeLegacyQueue()
    return
  }
  try {
    window.localStorage.setItem(LEGACY_QUEUE_KEY, JSON.stringify(remaining))
  } catch {}
}

function removeLegacyQueue(): void {
  try {
    window.localStorage.removeItem(LEGACY_QUEUE_KEY)
  } catch {}
}
