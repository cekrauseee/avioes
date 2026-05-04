import { describe, expect, it } from 'vitest'
import {
  makeAddEventOp,
  makeDeleteLatestEventOp,
  makeThemeOp,
  projectEvents,
  projectTheme,
  settleSnapshot,
  visibleTotals,
  type OfflineSnapshot
} from './offline-model'

const base: OfflineSnapshot = {
  identity: 'henrique',
  baseTheme: 'system',
  baseEvents: [
    { id: 'server:1', who: 'henrique', ts: 10 },
    { id: 'server:2', who: 'pietra', ts: 20 }
  ],
  pendingOps: []
}

describe('offline model', () => {
  it('projects pending adds into every derived view', () => {
    const add = makeAddEventOp('henrique', 30, 'a')
    const snapshot = { ...base, pendingOps: [add] }

    expect(projectEvents(snapshot.baseEvents, snapshot.pendingOps)).toEqual([...base.baseEvents, add.event])
    expect(visibleTotals(snapshot)).toEqual({ henrique: 2, pietra: 1 })
  })

  it('undo targets the exact latest visible event', () => {
    const add = makeAddEventOp('henrique', 30, 'a')
    const undo = makeDeleteLatestEventOp({ ...base, pendingOps: [add] }, 'henrique', 'op:undo')

    expect(undo).toEqual({ id: 'op:undo', kind: 'delete-event', eventId: add.event.id })
    expect(projectEvents(base.baseEvents, [add, undo!])).toEqual(base.baseEvents)
  })

  it('does not reinterpret undo when server state shifts', () => {
    const undo = makeDeleteLatestEventOp(base, 'henrique', 'op:undo')
    const shiftedServer = [...base.baseEvents, { id: 'server:3', who: 'henrique' as const, ts: 15 }]

    expect(projectEvents(shiftedServer, [undo!]).map((event) => event.id)).toEqual(['server:3', 'server:2'])
  })

  it('uses last pending theme write for local display', () => {
    expect(projectTheme('system', [makeThemeOp('dark', 'op:dark'), makeThemeOp('light', 'op:light')])).toBe('light')
  })

  it('settles acknowledged ops and replays remaining ops over canonical state', () => {
    const addA = makeAddEventOp('henrique', 30, 'a')
    const addB = makeAddEventOp('pietra', 40, 'b')
    const snapshot = { ...base, pendingOps: [addA, addB] }

    const settled = settleSnapshot(snapshot, {
      identity: 'henrique',
      events: [...base.baseEvents, addA.event],
      theme: 'system',
      settled: [addA.id]
    })

    expect(settled.pendingOps).toEqual([addB])
    expect(projectEvents(settled.baseEvents, settled.pendingOps).map((event) => event.id)).toEqual(['server:1', 'server:2', addA.event.id, addB.event.id])
  })

  it('drops pending ops when the server has no identity', () => {
    const add = makeAddEventOp('henrique', 30, 'a')
    const snapshot = { ...base, pendingOps: [add] }

    const settled = settleSnapshot(snapshot, {
      identity: null,
      events: [],
      theme: 'system',
      settled: []
    })

    expect(settled).toEqual({
      identity: null,
      baseEvents: [],
      baseTheme: 'system',
      pendingOps: []
    })
  })
})
