import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { migrateLegacyQueue } from './offline-db'
import type { OfflineSnapshot } from './offline-model'

const base: OfflineSnapshot = {
  identity: 'user-a',
  activeGroupId: 'group-1',
  groupMembers: [],
  baseTheme: 'system',
  basePalette: 'default',
  baseLocale: 'pt',
  baseEvents: [{ id: 'server:1', who: 'user-a', ts: 10 }],
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

  it('clears legacy queue and returns snapshot unchanged', () => {
    window.localStorage.setItem('ap_queue', JSON.stringify([{ id: 'old-add', op: 'add', who: 'user-a', ts: 20 }]))

    const migrated = migrateLegacyQueue(base)

    expect(migrated.pendingOps).toEqual([])
    expect(window.localStorage.getItem('ap_queue')).toBeNull()
  })

  it('does not migrate legacy ops before identity exists', () => {
    window.localStorage.setItem('ap_queue', JSON.stringify([{ id: 'old-add', op: 'add', who: 'user-a', ts: 20 }]))

    const migrated = migrateLegacyQueue({ ...base, identity: null })

    expect(migrated.pendingOps).toEqual([])
    expect(window.localStorage.getItem('ap_queue')).toBe(JSON.stringify([{ id: 'old-add', op: 'add', who: 'user-a', ts: 20 }]))
  })
})
