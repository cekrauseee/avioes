import type { OfflineSnapshot } from './offline-model'
import type { AirplaneEvent, Locale, Palette, PendingOp, Theme } from './types'

export type PersistedOfflineState = OfflineSnapshot & {
  version: 3
}

export type BootState = {
  userId: string | null
  activeGroupId: string | null
  theme: Theme
  palette: Palette
  locale: Locale
}

const DB_NAME = 'airplanes-offline'
const STORE_NAME = 'state'
const DB_VERSION = 3
const SNAPSHOT_KEY = 'snapshot'
const BOOT_KEY = 'ap_boot'
const LEGACY_QUEUE_KEY = 'ap_queue'

let dbPromise: Promise<IDBDatabase> | null = null

export function readBootState(): BootState {
  if (typeof window === 'undefined') return { userId: null, activeGroupId: null, theme: 'system', palette: 'default', locale: 'pt' }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BOOT_KEY) ?? '{}') as Partial<BootState>
    return {
      userId: typeof parsed.userId === 'string' && parsed.userId.length > 0 ? parsed.userId : null,
      activeGroupId: typeof parsed.activeGroupId === 'string' && parsed.activeGroupId.length > 0 ? parsed.activeGroupId : null,
      theme: parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system' ? parsed.theme : 'system',
      palette: isPalette(parsed.palette) ? parsed.palette : 'default',
      locale: isLocale(parsed.locale) ? parsed.locale : detectLocale()
    }
  } catch {
    return { userId: null, activeGroupId: null, theme: 'system', palette: 'default', locale: detectLocale() }
  }
}

export function writeBootState(boot: BootState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(BOOT_KEY, JSON.stringify(boot))
    document.cookie = `ap_locale=${boot.locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
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
  const value: PersistedOfflineState = { version: 3, ...snapshot }
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

  removeLegacyQueue()
  return snapshot
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
  const item = value as Record<string, unknown>
  if (item.version !== 3) return false
  if (!isStringOrNull(item.identity)) return false
  if (!isStringOrNull(item.activeGroupId)) return false
  if (!isTheme(item.baseTheme)) return false
  if (item.basePalette !== undefined && !isPalette(item.basePalette)) return false
  if (item.baseLocale !== undefined && !isLocale(item.baseLocale)) return false
  if (!Array.isArray(item.baseEvents) || !item.baseEvents.every(isEvent)) return false
  if (!Array.isArray(item.pendingOps) || !item.pendingOps.every(isPendingOp)) return false
  if (!Array.isArray(item.groupMembers) || !item.groupMembers.every(isGroupMember)) return false
  if (item.basePalette === undefined) (item as Record<string, unknown>).basePalette = 'default'
  if (item.baseLocale === undefined) (item as Record<string, unknown>).baseLocale = 'pt'
  if (item.onboardingStatus !== 'pending' && item.onboardingStatus !== 'complete') {
    ;(item as Record<string, unknown>).onboardingStatus = 'complete'
  }
  return true
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

function isEvent(value: unknown): value is AirplaneEvent {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<AirplaneEvent>
  return (
    typeof item.id === 'string' &&
    typeof item.who === 'string' &&
    item.who.length > 0 &&
    typeof item.ts === 'number' &&
    Number.isFinite(item.ts) &&
    item.ts > 0
  )
}

function isPalette(value: unknown): value is Palette {
  return value === 'default' || value === 'ocean' || value === 'lavender' || value === 'earth' || value === 'blossom' || value === 'sky'
}

function isLocale(value: unknown): value is Locale {
  return value === 'pt' || value === 'en'
}

function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'pt'
  return (navigator.language || '').startsWith('pt') ? 'pt' : 'en'
}

function isGroupMember(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.userId === 'string' &&
    typeof item.firstName === 'string' &&
    (item.lastName === null || typeof item.lastName === 'string') &&
    typeof item.email === 'string' &&
    (item.image === null || typeof item.image === 'string') &&
    (item.role === 'owner' || item.role === 'member')
  )
}

function isPendingOp(value: unknown): value is PendingOp {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<PendingOp>
  if (typeof item.id !== 'string') return false
  if (item.kind === 'add-event') return isEvent(item.event)
  if (item.kind === 'delete-event') return typeof item.eventId === 'string'
  if (item.kind === 'set-theme') return isTheme(item.theme)
  if (item.kind === 'set-palette') return isPalette(item.palette)
  if (item.kind === 'set-locale') return isLocale((item as { locale?: unknown }).locale)
  return false
}

function removeLegacyQueue(): void {
  try {
    window.localStorage.removeItem(LEGACY_QUEUE_KEY)
  } catch {}
}
