'use client'

import { useCallback, useEffect } from 'react'
import { writeBootState } from './offline-db'
import {
  isOffline as _isOffline,
  selectEvents as _selectEvents,
  selectLocale as _selectLocale,
  selectOfflineSyncing as _selectOfflineSyncing,
  selectPalette as _selectPalette,
  selectPendingCount as _selectPendingCount,
  selectTheme as _selectTheme,
  store,
  useAppStore,
  type AppState
} from './store/app-store'
import type { AirplaneEvent, GroupMember, Identity, Locale, Palette, PendingOp, Theme } from './types'

// ---------------------------------------------------------------------------
// Re-export the state type under the old name for consumers
// ---------------------------------------------------------------------------

export type OfflineStoreState = AppState

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useOfflineState(): AppState {
  return useAppStore()
}

export function useOfflineRuntime(): void {
  const init = useAppStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  const hydrated = useAppStore((s) => s.hydrated)
  const identity = useAppStore((s) => s.identity)
  const activeGroupId = useAppStore((s) => s.activeGroupId)
  const theme = useAppStore(_selectTheme)
  const palette = useAppStore(_selectPalette)
  const locale = useAppStore(_selectLocale)

  useEffect(() => {
    if (!hydrated) return
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.palette = palette
    document.documentElement.lang = locale === 'en' ? 'en' : 'pt-BR'
    writeBootState({ userId: identity, activeGroupId, theme, palette, locale })
  }, [hydrated, identity, activeGroupId, theme, palette, locale])
}

export function useOfflineSync(): void {
  const hydrated = useAppStore((s) => s.hydrated)
  const storageReady = useAppStore((s) => s.storageReady)
  const pendingOps = useAppStore((s) => s.pendingOps)
  const lastSyncOk = useAppStore((s) => s.lastSyncOk)

  const sync = useCallback(() => {
    void store.getState().drainOnce()
  }, [])

  useEffect(() => {
    if (!hydrated || !storageReady) return
    sync()
  }, [hydrated, storageReady, pendingOps, sync])

  useEffect(() => {
    const onOnline = () => {
      store.setState({ lastSyncOk: null })
      sync()
    }
    const onOffline = () => {
      const s = store.getState()
      store.setState({
        lastSyncOk: null,
        offlineSyncPending: s.offlineSyncPending || s.pendingOps.length > 0,
        offlineSyncInFlight: false
      })
    }
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
    if (!hydrated || !storageReady) return
    if (pendingOps.length === 0 && lastSyncOk === true) return
    const id = window.setInterval(sync, pendingOps.length > 0 ? 5000 : 8000)
    return () => window.clearInterval(id)
  }, [hydrated, storageReady, pendingOps.length, lastSyncOk, sync])
}

// ---------------------------------------------------------------------------
// Selectors (same signatures as before, accept state object)
// ---------------------------------------------------------------------------

export function selectEvents(snapshot: AppState): AirplaneEvent[] {
  return _selectEvents(snapshot)
}

export function selectTheme(snapshot: AppState): Theme {
  return _selectTheme(snapshot)
}

export function selectPalette(snapshot: AppState): Palette {
  return _selectPalette(snapshot)
}

export function selectLocale(snapshot: AppState): Locale {
  return _selectLocale(snapshot)
}

export function selectPendingCount(snapshot: AppState): number {
  return _selectPendingCount(snapshot)
}

export function selectOfflineSyncing(snapshot: AppState): boolean {
  return _selectOfflineSyncing(snapshot)
}

export function isOffline(snapshot: AppState): boolean {
  return _isOffline(snapshot)
}

// ---------------------------------------------------------------------------
// Imperative actions (same standalone-function API as before)
// ---------------------------------------------------------------------------

export function addAirplane(who: Identity): void {
  store.getState().addAirplane(who)
}

export function undoAirplane(who: Identity): boolean {
  return store.getState().undoAirplane(who)
}

export function queueTheme(theme: Theme): void {
  store.getState().queueTheme(theme)
}

export function queuePalette(palette: Palette): void {
  store.getState().queuePalette(palette)
}

export function switchLocale(locale: Locale): void {
  store.getState().switchLocale(locale)
}

export function applyServerSnapshot(sync: import('./offline-model').SyncSnapshot): void {
  store.getState().applyServerSnapshot(sync)
}

export function applyLocalIdentity(identity: Identity | null): void {
  store.getState().applyLocalIdentity(identity)
}

export function applyActiveGroup(activeGroupId: string | null, groupMembers: GroupMember[]): void {
  store.getState().applyActiveGroup(activeGroupId, groupMembers)
}

export async function drainOnce(): Promise<void> {
  return store.getState().drainOnce()
}

// ---------------------------------------------------------------------------
// Re-exports for type compatibility
// ---------------------------------------------------------------------------

export type { AirplaneEvent, GroupMember, Identity, Locale, Palette, PendingOp, Theme }
