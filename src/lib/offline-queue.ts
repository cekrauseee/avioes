'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { syncEvents } from '../actions'
import type { AirplaneEvent, Identity, QueueOp } from './types'

export type Queue = readonly QueueOp[]

const STORAGE_KEY = 'ap_queue'
const CHANNEL_NAME = 'ap_queue'
const EMPTY: Queue = Object.freeze([])

let cachedRaw: string | null | undefined = undefined
let cachedQueue: Queue = EMPTY

function read(): Queue {
  if (typeof window === 'undefined') return EMPTY
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === cachedRaw) return cachedQueue
  cachedRaw = raw
  if (!raw) {
    cachedQueue = EMPTY
    return cachedQueue
  }
  try {
    const parsed = JSON.parse(raw)
    cachedQueue = Array.isArray(parsed) ? (parsed as QueueOp[]) : EMPTY
  } catch {
    cachedQueue = EMPTY
  }
  return cachedQueue
}

const listeners = new Set<() => void>()
let bc: BroadcastChannel | null = null

function ensureChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null
  if (bc) return bc
  if (typeof BroadcastChannel === 'undefined') return null
  bc = new BroadcastChannel(CHANNEL_NAME)
  bc.addEventListener('message', () => {
    cachedRaw = undefined
    listeners.forEach((l) => l())
  })
  return bc
}

function notifyLocal() {
  cachedRaw = undefined
  listeners.forEach((l) => l())
  ensureChannel()?.postMessage(0)
}

function persist(next: Queue): void {
  if (typeof window === 'undefined') return
  if (next.length === 0) window.localStorage.removeItem(STORAGE_KEY)
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  notifyLocal()
}

function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener)
  let active = true
  queueMicrotask(() => {
    if (!active) return
    cachedRaw = undefined
    listener()
  })
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      cachedRaw = undefined
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  ensureChannel()
  return () => {
    active = false
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useQueue(): Queue {
  return useSyncExternalStore(subscribeQueue, read, () => EMPTY)
}

export function readQueue(): Queue {
  return read()
}

export function enqueueAdd(who: Identity): void {
  const q = read()
  const op: QueueOp = { id: crypto.randomUUID(), op: 'add', who, ts: Date.now() }
  persist([...q, op])
}

export function enqueueUndo(who: Identity): void {
  const q = read()
  for (let i = q.length - 1; i >= 0; i--) {
    const item = q[i]
    if (item.who !== who) continue
    if (item.op === 'add') {
      persist([...q.slice(0, i), ...q.slice(i + 1)])
      return
    }
    break
  }
  const op: QueueOp = { id: crypto.randomUUID(), op: 'undo', who }
  persist([...q, op])
}

export function dropOps(ids: readonly string[]): void {
  if (ids.length === 0) return
  const drop = new Set(ids)
  const q = read()
  const next = q.filter((op) => !drop.has(op.id))
  if (next.length === q.length) return
  persist(next)
}

export function deltaFor(queue: Queue, who: Identity): number {
  let d = 0
  for (const op of queue) {
    if (op.who !== who) continue
    d += op.op === 'add' ? 1 : -1
  }
  return d
}

export function totalDelta(queue: Queue): number {
  let d = 0
  for (const op of queue) d += op.op === 'add' ? 1 : -1
  return d
}

// Project pending queue ops into the server event list so /diary and
// /scoreboard show offline taps before they sync. Adds become synthetic
// events at op.ts; undos drop the most recent event for that user from the
// merged list (server events first, then synthetic adds in queue order).
export function mergeQueueIntoEvents(serverEvents: AirplaneEvent[], queue: Queue): AirplaneEvent[] {
  if (queue.length === 0) return serverEvents
  const merged: AirplaneEvent[] = [...serverEvents]
  for (const op of queue) {
    if (op.op === 'add') {
      merged.push({ who: op.who, ts: op.ts })
    } else {
      for (let i = merged.length - 1; i >= 0; i--) {
        if (merged[i].who === op.who) {
          merged.splice(i, 1)
          break
        }
      }
    }
  }
  merged.sort((a, b) => a.ts - b.ts)
  return merged
}

function readOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

function subscribeOnline(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const resetSyncStatus = () => {
    if (lastSyncOk !== null) {
      lastSyncOk = null
      syncResultListeners.forEach((l) => l())
    }
    listener()
  }
  window.addEventListener('online', resetSyncStatus)
  window.addEventListener('offline', resetSyncStatus)
  return () => {
    window.removeEventListener('online', resetSyncStatus)
    window.removeEventListener('offline', resetSyncStatus)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, readOnline, () => true)
}

// `navigator.onLine` lies in some PWA setups (Wi-Fi up but server unreachable,
// or SW-served reloads where the online event never fires). We track the
// outcome of the last actual sync attempt as a more reliable signal: `true`
// after a successful round-trip, `false` after a failed one, `null` until the
// first attempt has resolved.

let lastSyncOk: boolean | null = null
const syncResultListeners = new Set<() => void>()

export function reportSyncResult(ok: boolean): void {
  if (lastSyncOk === ok) return
  lastSyncOk = ok
  syncResultListeners.forEach((l) => l())
}

function getLastSyncOk(): boolean | null {
  return lastSyncOk
}

function subscribeSyncResult(listener: () => void): () => void {
  syncResultListeners.add(listener)
  return () => {
    syncResultListeners.delete(listener)
  }
}

export function useLastSyncOk(): boolean | null {
  return useSyncExternalStore(subscribeSyncResult, getLastSyncOk, () => null)
}

// Successful sync is ground truth: if the last round-trip landed, we are
// online regardless of what `navigator.onLine` says (it can stay stuck after
// PWA reloads where the `online` event never fires). If the last attempt
// failed, we are offline. Otherwise fall back to `navigator.onLine`.
export function useOffline(): boolean {
  const online = useOnline()
  const lastSyncOk = useLastSyncOk()
  if (lastSyncOk === true) return false
  if (lastSyncOk === false) return true
  return !online
}

export type SyncResult = { acked: string[]; my: number; total: number }

const ackListeners = new Set<(r: SyncResult) => void>()

export function onSyncAck(listener: (r: SyncResult) => void): () => void {
  ackListeners.add(listener)
  return () => {
    ackListeners.delete(listener)
  }
}

let inFlight = false
let rerunPending = false

function setInFlight(v: boolean): void {
  if (inFlight === v) return
  inFlight = v
}

// Hydration sentinel. Server / first-client-render returns `false`; after
// the bundle parse we flip to `true` via a microtask so the next render
// (post-hydration commit) sees the flipped value. Use this instead of a
// `useState`-in-`useEffect` pattern (which the project's lint rule flags
// as a mirror-state mistake) to gate behavior on "first commit done".
let hydrated = false
const hydrationListeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  queueMicrotask(() => {
    hydrated = true
    hydrationListeners.forEach((l) => l())
  })
}
function subscribeHydration(listener: () => void): () => void {
  hydrationListeners.add(listener)
  return () => {
    hydrationListeners.delete(listener)
  }
}
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => hydrated,
    () => false
  )
}

export async function drainOnce(): Promise<void> {
  // If a drain is in progress, mark a follow-up. A reconnect that fires the
  // `online` event while the mount-time drain is still failing offline would
  // otherwise be lost — without the rerun, the next attempt only happens on
  // the next interval tick (perceived as a "few-second" delay before the
  // badge clears).
  if (inFlight) {
    rerunPending = true
    return
  }
  const snapshot = readQueue()
  // Skip only when there's nothing to send AND connectivity is already
  // confirmed. With an empty queue but unknown/failed last status, we still
  // probe (`syncEvents([])` returns counts) so `lastSyncOk` reflects truth
  // independent of `navigator.onLine` events that PWAs sometimes miss.
  if (snapshot.length === 0 && lastSyncOk === true) return
  if (!readOnline() && lastSyncOk !== true) {
    reportSyncResult(false)
    return
  }
  setInFlight(true)
  try {
    const result = await syncEvents([...snapshot])
    if (result.acked.length > 0) {
      flushSync(() => {
        ackListeners.forEach((l) => l(result))
      })
      dropOps(result.acked)
      refreshShellCache()
    }
    reportSyncResult(true)
  } catch {
    reportSyncResult(false)
  } finally {
    setInFlight(false)
    if (rerunPending) {
      rerunPending = false
      void drainOnce()
    }
  }
}

// Ask the service worker to re-fetch the navigable shell pages and refresh
// its HTTP cache for them. Without this, the SW's cached `/` (etc.) is only
// updated when the user does a full reload while online — so adding events
// online via Server Actions never refreshes the cached HTML, and a later
// offline reload renders a stale `myCount` from possibly many sessions ago.
function refreshShellCache(): void {
  if (typeof navigator === 'undefined') return
  const sw = navigator.serviceWorker?.controller
  if (!sw) return
  try {
    sw.postMessage({ type: 'refresh-shell' })
  } catch {
    // not reachable, ignore
  }
}

// Centralized drain loop. Runs on mount, queue change, `online`,
// `visibilitychange→visible`, and a periodic retry while queue has items.
// Mounted globally (layout) so /diary and /scoreboard also drain after
// reconnecting — not only the counter route. Listeners can subscribe via
// `onSyncAck` to react to a successful sync (e.g. counter override).
export function useOfflineSync(): void {
  const queue = useQueue()
  const lastOk = useLastSyncOk()

  const sync = useCallback(() => {
    void drainOnce()
  }, [])

  useEffect(() => {
    sync()
  }, [sync, queue])

  useEffect(() => {
    const onOnline = () => sync()
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sync])

  // Periodic probe. Runs while there are pending ops OR connectivity isn't
  // confirmed (`lastOk !== true`). Covers PWA reloads where the `online`
  // event never fires after reconnecting — without this, badges could stay
  // stuck on "offline" until the user navigates and forces a remount.
  useEffect(() => {
    if (queue.length === 0 && lastOk === true) return
    const period = queue.length > 0 ? 2000 : 8000
    const id = window.setInterval(sync, period)
    return () => window.clearInterval(id)
  }, [queue.length, lastOk, sync])
}
