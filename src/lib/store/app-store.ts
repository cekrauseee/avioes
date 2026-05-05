'use client'

import { createStore, useStore } from 'zustand'
import { bootstrapState, syncOps } from '../../actions'
import {
  clearBootState,
  clearPersistedState,
  migrateLegacyQueue,
  readBootState,
  readPersistedState,
  writeBootState,
  writePersistedState
} from '../offline-db'
import {
  makeAddEventOp,
  makeDeleteLatestEventOp,
  makeLocaleOp,
  makePaletteOp,
  makeThemeOp,
  pendingWriteCount,
  projectEvents,
  projectLocale,
  projectPalette,
  projectTheme,
  settleSnapshot,
  type OfflineSnapshot,
  type SyncSnapshot
} from '../offline-model'
import type { AirplaneEvent, GroupMember, Identity, Locale, Palette, PendingOp, Theme } from '../types'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export type AppState = {
  identity: Identity | null
  activeGroupId: string | null
  groupMembers: GroupMember[]
  baseEvents: AirplaneEvent[]
  baseTheme: Theme
  basePalette: Palette
  baseLocale: Locale
  pendingOps: PendingOp[]

  hydrated: boolean
  storageReady: boolean
  storageError: boolean
  lastSyncOk: boolean | null
  syncInFlight: boolean
  offlineSyncPending: boolean
  offlineSyncInFlight: boolean
  localeFading: boolean
}

export type AppActions = {
  addAirplane: (who: Identity) => void
  undoAirplane: (who: Identity) => boolean
  queueTheme: (theme: Theme) => void
  queuePalette: (palette: Palette) => void
  switchLocale: (locale: Locale) => void
  applyServerSnapshot: (sync: SyncSnapshot) => void
  applyLocalIdentity: (identity: Identity | null) => void
  applyActiveGroup: (groupId: string | null, members: GroupMember[]) => void
  drainOnce: () => Promise<void>
  init: () => void
}

export type AppStore = AppState & AppActions

// ---------------------------------------------------------------------------
// Selectors (pure derivations, not stored)
// ---------------------------------------------------------------------------

export function selectEvents(s: AppState): AirplaneEvent[] {
  return projectEvents(s.baseEvents, s.pendingOps)
}

export function selectTheme(s: AppState): Theme {
  return projectTheme(s.baseTheme, s.pendingOps)
}

export function selectPalette(s: AppState): Palette {
  return projectPalette(s.basePalette, s.pendingOps)
}

export function selectLocale(s: AppState): Locale {
  return projectLocale(s.baseLocale, s.pendingOps)
}

export function selectPendingCount(s: AppState): number {
  return pendingWriteCount(s.pendingOps)
}

export function selectOfflineSyncing(s: AppState): boolean {
  return s.offlineSyncInFlight
}

export function isOffline(s: AppState): boolean {
  if (s.lastSyncOk === true) return false
  if (s.lastSyncOk === false) return true
  if (typeof navigator === 'undefined') return false
  return !navigator.onLine
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_EVENTS: AirplaneEvent[] = []
const EMPTY_OPS: PendingOp[] = []
const EMPTY_MEMBERS: GroupMember[] = []
const SYNC_BATCH_SIZE = 250
const LOCALE_FADE_MS = 180

// ---------------------------------------------------------------------------
// Module-level sync guards (shared across the singleton store)
// ---------------------------------------------------------------------------

let syncInFlight = false
let rerunPending = false
let initialized = false

// ---------------------------------------------------------------------------
// Persistence helpers (commit to IndexedDB + localStorage boot hint)
// ---------------------------------------------------------------------------

function persistSnapshot(state: AppState): void {
  const persisted: OfflineSnapshot = {
    identity: state.identity,
    activeGroupId: state.activeGroupId,
    groupMembers: state.groupMembers,
    baseEvents: state.baseEvents,
    baseTheme: state.baseTheme,
    basePalette: state.basePalette,
    baseLocale: state.baseLocale,
    pendingOps: state.pendingOps
  }
  writeBootState({
    userId: state.identity,
    activeGroupId: state.activeGroupId,
    theme: selectTheme(state),
    palette: selectPalette(state),
    locale: selectLocale(state)
  })
  void writePersistedState(persisted).catch(() => {
    store.setState({ storageError: true })
  })
}

function readOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

// ---------------------------------------------------------------------------
// BroadcastChannel for cross-tab sync
// ---------------------------------------------------------------------------

let bc: BroadcastChannel | null = null

type BroadcastPayload = Pick<
  AppState,
  'identity' | 'activeGroupId' | 'groupMembers' | 'baseEvents' | 'baseTheme' | 'basePalette' | 'baseLocale' | 'lastSyncOk'
>

function broadcastState(state: AppState): void {
  bc?.postMessage({
    identity: state.identity,
    activeGroupId: state.activeGroupId,
    groupMembers: state.groupMembers,
    baseEvents: state.baseEvents,
    baseTheme: state.baseTheme,
    basePalette: state.basePalette,
    baseLocale: state.baseLocale,
    lastSyncOk: state.lastSyncOk
  } satisfies BroadcastPayload)
}

function isValidBroadcast(value: unknown): value is BroadcastPayload {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.identity !== null && typeof v.identity !== 'string') return false
  if (v.activeGroupId !== null && typeof v.activeGroupId !== 'string') return false
  if (!Array.isArray(v.baseEvents)) return false
  if (!Array.isArray(v.groupMembers)) return false
  return true
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

function createAppStore() {
  return createStore<AppStore>()((set, get) => {
    function commit(patch: Partial<AppState>): void {
      set(patch)
      const next = get()
      persistSnapshot(next)
      broadcastState(next)
    }

    async function drainOnce(): Promise<void> {
      if (syncInFlight) {
        rerunPending = true
        return
      }
      const s = get()
      if (!s.hydrated || !s.storageReady || s.storageError) return
      if (!readOnline() && s.lastSyncOk !== true) {
        set({
          lastSyncOk: false,
          offlineSyncPending: s.offlineSyncPending || s.pendingOps.length > 0,
          offlineSyncInFlight: false
        })
        return
      }
      if (s.pendingOps.length === 0 && s.lastSyncOk === true) return
      if (!s.identity) {
        syncInFlight = true
        set({ syncInFlight: true, offlineSyncInFlight: false })
        try {
          get().applyServerSnapshot(await bootstrapState())
        } catch {
          set({ lastSyncOk: false, syncInFlight: false, offlineSyncInFlight: false })
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
      set({
        syncInFlight: true,
        offlineSyncInFlight: s.pendingOps.length > 0 && s.offlineSyncPending
      })
      try {
        const result = s.pendingOps.length > 0 ? await syncOps(s.pendingOps.slice(0, SYNC_BATCH_SIZE)) : await bootstrapState()
        get().applyServerSnapshot(result)
      } catch {
        const current = get()
        set({
          lastSyncOk: false,
          syncInFlight: false,
          offlineSyncPending: current.offlineSyncPending || (!readOnline() && current.pendingOps.length > 0),
          offlineSyncInFlight: false
        })
      } finally {
        syncInFlight = false
        if (rerunPending) {
          rerunPending = false
          void drainOnce()
        }
      }
    }

    return {
      // Data
      identity: null,
      activeGroupId: null,
      groupMembers: EMPTY_MEMBERS,
      baseEvents: EMPTY_EVENTS,
      baseTheme: 'system' as Theme,
      basePalette: 'default' as Palette,
      baseLocale: 'pt' as Locale,
      pendingOps: EMPTY_OPS,

      // Status
      hydrated: false,
      storageReady: false,
      storageError: false,
      lastSyncOk: null,
      syncInFlight: false,
      offlineSyncPending: false,
      offlineSyncInFlight: false,
      localeFading: false,

      // Actions
      addAirplane(who: Identity) {
        const op = makeAddEventOp(who, Date.now(), crypto.randomUUID())
        commit({ pendingOps: [...get().pendingOps, op] })
      },

      undoAirplane(who: Identity): boolean {
        const s = get()
        const op = makeDeleteLatestEventOp(s, who, `op:${crypto.randomUUID()}`)
        if (!op) return false
        commit({ pendingOps: [...s.pendingOps, op] })
        return true
      },

      queueTheme(theme: Theme) {
        commit({ pendingOps: [...get().pendingOps, makeThemeOp(theme, `op:${crypto.randomUUID()}`)] })
      },

      queuePalette(palette: Palette) {
        commit({ pendingOps: [...get().pendingOps, makePaletteOp(palette, `op:${crypto.randomUUID()}`)] })
      },

      switchLocale(locale: Locale) {
        const s = get()
        if (selectLocale(s) === locale) return
        set({ localeFading: true })
        window.setTimeout(() => {
          commit({ pendingOps: [...get().pendingOps, makeLocaleOp(locale, `op:${crypto.randomUUID()}`)] })
          set({ localeFading: false })
        }, LOCALE_FADE_MS)
      },

      applyServerSnapshot(sync: SyncSnapshot) {
        const s = get()
        const next = migrateLegacyQueue(settleSnapshot(s, sync))
        commit({
          ...next,
          lastSyncOk: true,
          storageReady: true,
          storageError: false,
          syncInFlight: false,
          offlineSyncPending: false,
          offlineSyncInFlight: false
        })
      },

      applyLocalIdentity(identity: Identity | null) {
        if (identity) {
          commit({ identity })
        } else {
          commit({
            identity: null,
            activeGroupId: null,
            groupMembers: EMPTY_MEMBERS,
            baseEvents: EMPTY_EVENTS,
            baseTheme: 'system',
            basePalette: 'default',
            baseLocale: 'pt',
            pendingOps: EMPTY_OPS,
            offlineSyncPending: false,
            offlineSyncInFlight: false
          })
          clearBootState()
          void clearPersistedState().catch(() => {})
        }
      },

      applyActiveGroup(groupId: string | null, members: GroupMember[]) {
        commit({ activeGroupId: groupId, groupMembers: members })
      },

      drainOnce,

      init() {
        if (initialized) return
        initialized = true

        queueMicrotask(() => {
          const boot = readBootState()
          set({
            hydrated: true,
            identity: boot.userId,
            activeGroupId: boot.activeGroupId,
            baseTheme: boot.theme,
            basePalette: boot.palette,
            baseLocale: boot.locale
          })
          void readPersistedState()
            .then((persisted) => {
              if (!persisted) {
                const next = migrateLegacyQueue({
                  identity: boot.userId,
                  activeGroupId: boot.activeGroupId,
                  groupMembers: EMPTY_MEMBERS,
                  baseEvents: EMPTY_EVENTS,
                  baseTheme: boot.theme,
                  basePalette: boot.palette,
                  baseLocale: boot.locale,
                  pendingOps: EMPTY_OPS
                })
                set({ ...next, storageReady: true, offlineSyncPending: next.pendingOps.length > 0 })
                return
              }
              const next = migrateLegacyQueue({
                identity: persisted.identity,
                activeGroupId: persisted.activeGroupId,
                groupMembers: persisted.groupMembers ?? EMPTY_MEMBERS,
                baseEvents: persisted.baseEvents,
                baseTheme: persisted.baseTheme,
                basePalette: persisted.basePalette,
                baseLocale: persisted.baseLocale ?? 'pt',
                pendingOps: persisted.pendingOps
              })
              set({ ...next, storageReady: true, storageError: false, offlineSyncPending: next.pendingOps.length > 0 })
            })
            .catch(() => set({ storageReady: true, storageError: true }))
        })

        window.addEventListener('storage', (event) => {
          if (event.key !== 'ap_boot') return
          const boot = readBootState()
          set({
            identity: boot.userId,
            activeGroupId: boot.activeGroupId,
            baseTheme: boot.theme,
            basePalette: boot.palette,
            baseLocale: boot.locale
          })
        })

        if (typeof BroadcastChannel !== 'undefined') {
          bc = new BroadcastChannel('airplanes-offline')
          bc.addEventListener('message', (event) => {
            if (!isValidBroadcast(event.data)) return
            set(event.data)
          })
        }
      }
    }
  })
}

// ---------------------------------------------------------------------------
// Singleton store instance
// ---------------------------------------------------------------------------

let _store: ReturnType<typeof createAppStore> | null = null

function getStore(): ReturnType<typeof createAppStore> {
  if (!_store) _store = createAppStore()
  return _store
}

export const store = typeof window !== 'undefined' ? getStore() : (null as unknown as ReturnType<typeof createAppStore>)

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

const identity = <T>(s: T) => s

export function useAppStore(): AppStore
export function useAppStore<T>(selector: (state: AppStore) => T): T
export function useAppStore<T>(selector?: (state: AppStore) => T) {
  return useStore(getStore(), (selector ?? identity) as (state: AppStore) => T)
}
