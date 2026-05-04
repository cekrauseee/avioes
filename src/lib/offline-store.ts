'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { bootstrapState, syncOps } from '../actions'
import {
  clearBootState,
  clearPersistedState,
  migrateLegacyQueue,
  readBootState,
  readPersistedState,
  writeBootState,
  writePersistedState
} from './offline-db'
import {
  makeAddEventOp,
  makeDeleteLatestEventOp,
  makeThemeOp,
  pendingWriteCount,
  projectEvents,
  projectTheme,
  settleSnapshot,
  type OfflineSnapshot,
  type SyncSnapshot
} from './offline-model'
import type { AirplaneEvent, Identity, PendingOp, Theme } from './types'

export type OfflineStoreState = OfflineSnapshot & {
  hydrated: boolean
  storageReady: boolean
  storageError: boolean
  lastSyncOk: boolean | null
  syncInFlight: boolean
}

type BroadcastState = Pick<OfflineStoreState, 'identity' | 'baseEvents' | 'baseTheme' | 'lastSyncOk'>

const EMPTY_EVENTS: AirplaneEvent[] = []
const EMPTY_OPS: PendingOp[] = []
const SYNC_BATCH_SIZE = 250

let state: OfflineStoreState = {
  identity: null,
  baseEvents: EMPTY_EVENTS,
  baseTheme: 'system',
  pendingOps: EMPTY_OPS,
  hydrated: false,
  storageReady: false,
  storageError: false,
  lastSyncOk: null,
  syncInFlight: false
}

const serverState: OfflineStoreState = state
const listeners = new Set<() => void>()
let initialized = false
let bc: BroadcastChannel | null = null
let syncInFlight = false
let rerunPending = false

export function useOfflineState(): OfflineStoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useOfflineRuntime(): void {
  useEffect(() => {
    initOfflineStore()
  }, [])

  const snapshot = useOfflineState()
  const theme = selectTheme(snapshot)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    writeBootState({ identity: snapshot.identity, theme })
  }, [snapshot.identity, theme])
}

export function useOfflineSync(): void {
  const snapshot = useOfflineState()
  const sync = useCallback(() => {
    void drainOnce()
  }, [])

  useEffect(() => {
    if (!snapshot.hydrated || !snapshot.storageReady) return
    sync()
  }, [snapshot.hydrated, snapshot.storageReady, snapshot.pendingOps, sync])

  useEffect(() => {
    const onOnline = () => {
      updateState({ lastSyncOk: null })
      sync()
    }
    const onOffline = () => updateState({ lastSyncOk: null })
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sync])

  useEffect(() => {
    if (!snapshot.hydrated || !snapshot.storageReady) return
    if (snapshot.pendingOps.length === 0 && snapshot.lastSyncOk === true) return
    const id = window.setInterval(sync, snapshot.pendingOps.length > 0 ? 5000 : 8000)
    return () => window.clearInterval(id)
  }, [snapshot.hydrated, snapshot.storageReady, snapshot.pendingOps.length, snapshot.lastSyncOk, sync])
}

export function selectEvents(snapshot: OfflineSnapshot): AirplaneEvent[] {
  return projectEvents(snapshot.baseEvents, snapshot.pendingOps)
}

export function selectTheme(snapshot: OfflineSnapshot): Theme {
  return projectTheme(snapshot.baseTheme, snapshot.pendingOps)
}

export function selectPendingCount(snapshot: OfflineSnapshot): number {
  return pendingWriteCount(snapshot.pendingOps)
}

export function isOffline(snapshot: OfflineStoreState): boolean {
  if (snapshot.lastSyncOk === true) return false
  if (snapshot.lastSyncOk === false) return true
  if (typeof navigator === 'undefined') return false
  return !navigator.onLine
}

export function addAirplane(who: Identity): void {
  const op = makeAddEventOp(who, Date.now(), crypto.randomUUID())
  commit({ pendingOps: [...state.pendingOps, op] })
}

export function undoAirplane(who: Identity): boolean {
  const op = makeDeleteLatestEventOp(state, who, `op:${crypto.randomUUID()}`)
  if (!op) return false
  commit({ pendingOps: [...state.pendingOps, op] })
  return true
}

export function queueTheme(theme: Theme): void {
  commit({ pendingOps: [...state.pendingOps, makeThemeOp(theme, `op:${crypto.randomUUID()}`)] })
}

export function applyServerSnapshot(sync: SyncSnapshot): void {
  const next = migrateLegacyQueue(settleSnapshot(state, sync))
  commit({ ...next, lastSyncOk: true, storageReady: true, storageError: false, syncInFlight: false })
}

export function applyLocalIdentity(identity: Identity | null): void {
  if (identity) {
    commit({ identity })
  } else {
    commit({ identity: null, baseEvents: EMPTY_EVENTS, baseTheme: 'system', pendingOps: EMPTY_OPS })
    clearBootState()
    void clearPersistedState().catch(() => {})
  }
}

export async function drainOnce(): Promise<void> {
  if (syncInFlight) {
    rerunPending = true
    return
  }
  if (!state.hydrated || !state.storageReady || state.storageError) return
  if (!readOnline() && state.lastSyncOk !== true) {
    updateState({ lastSyncOk: false })
    return
  }
  if (state.pendingOps.length === 0 && state.lastSyncOk === true) return
  if (!state.identity) {
    syncInFlight = true
    updateState({ syncInFlight: true })
    try {
      applyServerSnapshot(await bootstrapState())
    } catch {
      updateState({ lastSyncOk: false, syncInFlight: false })
    } finally {
      syncInFlight = false
      if (rerunPending) {
        rerunPending = false
        void drainOnce()
      }
    }
    return
  }

  syncInFlight = true
  updateState({ syncInFlight: true })
  try {
    const result = state.pendingOps.length > 0 ? await syncOps(state.pendingOps.slice(0, SYNC_BATCH_SIZE)) : await bootstrapState()
    applyServerSnapshot(result)
  } catch {
    updateState({ lastSyncOk: false, syncInFlight: false })
  } finally {
    syncInFlight = false
    if (rerunPending) {
      rerunPending = false
      void drainOnce()
    }
  }
}

function initOfflineStore(): void {
  if (initialized) return
  initialized = true

  queueMicrotask(() => {
    const boot = readBootState()
    updateState({ hydrated: true, identity: boot.identity, baseTheme: boot.theme })
    void readPersistedState()
      .then((persisted) => {
        if (!persisted) {
          const next = migrateLegacyQueue({
            identity: boot.identity,
            baseEvents: EMPTY_EVENTS,
            baseTheme: boot.theme,
            pendingOps: EMPTY_OPS
          })
          updateState({ ...next, storageReady: true })
          return
        }
        const next = migrateLegacyQueue({
          identity: persisted.identity,
          baseEvents: persisted.baseEvents,
          baseTheme: persisted.baseTheme,
          pendingOps: persisted.pendingOps
        })
        updateState({
          ...next,
          storageReady: true,
          storageError: false
        })
      })
      .catch(() => updateState({ storageReady: true, storageError: true }))
  })

  window.addEventListener('storage', (event) => {
    if (event.key !== 'ap_boot') return
    const boot = readBootState()
    updateState({ identity: boot.identity, baseTheme: boot.theme })
  })

  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel('airplanes-offline')
    bc.addEventListener('message', (event) => {
      const incoming = readBroadcastState(event.data)
      if (!incoming) return
      updateState(incoming, false)
    })
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): OfflineStoreState {
  return state
}

function getServerSnapshot(): OfflineStoreState {
  return serverState
}

function commit(patch: Partial<OfflineStoreState>): void {
  updateState(patch)
  const persisted: OfflineSnapshot = {
    identity: state.identity,
    baseEvents: state.baseEvents,
    baseTheme: state.baseTheme,
    pendingOps: state.pendingOps
  }
  writeBootState({ identity: state.identity, theme: selectTheme(state) })
  void writePersistedState(persisted).catch(() => updateState({ storageError: true }))
}

function updateState(patch: Partial<OfflineStoreState>, broadcast = true): void {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
  if (broadcast) bc?.postMessage(toBroadcastState(state))
}

function readOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

function toBroadcastState(snapshot: OfflineStoreState): BroadcastState {
  return {
    identity: snapshot.identity,
    baseEvents: snapshot.baseEvents,
    baseTheme: snapshot.baseTheme,
    lastSyncOk: snapshot.lastSyncOk
  }
}

function readBroadcastState(value: unknown): BroadcastState | null {
  if (typeof value !== 'object' || value === null) return null
  const item = value as Partial<BroadcastState>
  if (!isIdentityOrNull(item.identity)) return null
  if (!isTheme(item.baseTheme)) return null
  if (item.lastSyncOk !== true && item.lastSyncOk !== false && item.lastSyncOk !== null) return null
  if (!Array.isArray(item.baseEvents) || !item.baseEvents.every(isEvent)) return null
  return {
    identity: item.identity,
    baseEvents: item.baseEvents,
    baseTheme: item.baseTheme,
    lastSyncOk: item.lastSyncOk
  }
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
