import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { migrateLegacyQueue } from './offline-db'
import type { OfflineSnapshot } from './offline-model'

const base: OfflineSnapshot = {
  identity: 'henrique',
  baseTheme: 'system',
  basePalette: 'default',
  baseEvents: [{ id: 'server:1', who: 'henrique', ts: 10 }],
  pendingOps: []
}

describe('offline DB migration', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key)
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('migrates legacy queued adds without trusting auth data', () => {
    window.localStorage.setItem('ap_queue', JSON.stringify([{ id: 'old-add', op: 'add', who: 'henrique', ts: 20 }]))

    const migrated = migrateLegacyQueue(base)

    expect(migrated.pendingOps).toEqual([
      {
        id: 'old-add',
        kind: 'add-event',
        event: { id: 'legacy-event:old-add', who: 'henrique', ts: 20 }
      }
    ])
    expect(window.localStorage.getItem('ap_queue')).toBeNull()
  })

  it('keeps legacy undo pending until there is an event to target', () => {
    window.localStorage.setItem('ap_queue', JSON.stringify([{ id: 'old-undo', op: 'undo', who: 'henrique' }]))

    const blocked = migrateLegacyQueue({ ...base, baseEvents: [] })
    expect(blocked.pendingOps).toEqual([])
    expect(window.localStorage.getItem('ap_queue')).toBe(JSON.stringify([{ id: 'old-undo', op: 'undo', who: 'henrique' }]))

    const migrated = migrateLegacyQueue(base)
    expect(migrated.pendingOps).toEqual([{ id: 'old-undo', kind: 'delete-event', eventId: 'server:1' }])
    expect(window.localStorage.getItem('ap_queue')).toBeNull()
  })

  it('does not migrate legacy ops before identity exists', () => {
    window.localStorage.setItem('ap_queue', JSON.stringify([{ id: 'old-add', op: 'add', who: 'henrique', ts: 20 }]))

    const migrated = migrateLegacyQueue({ ...base, identity: null })

    expect(migrated.pendingOps).toEqual([])
    expect(window.localStorage.getItem('ap_queue')).toBe(JSON.stringify([{ id: 'old-add', op: 'add', who: 'henrique', ts: 20 }]))
  })
})
