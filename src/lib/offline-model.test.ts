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

const USER_A = 'user-a'
const USER_B = 'user-b'

const base: OfflineSnapshot = {
  identity: USER_A,
  activeGroupId: 'group-1',
  groupMembers: [],
  baseTheme: 'system',
  basePalette: 'default',
  baseLocale: 'pt',
  baseEvents: [
    { id: 'server:1', who: USER_A, ts: 10 },
    { id: 'server:2', who: USER_B, ts: 20 }
  ],
  pendingOps: []
}

describe('offline model', () => {
  it('projects pending adds into every derived view', () => {
    const add = makeAddEventOp(USER_A, 30, 'a')
    const snapshot = { ...base, pendingOps: [add] }

    expect(projectEvents(snapshot.baseEvents, snapshot.pendingOps)).toEqual([...base.baseEvents, add.event])
    expect(visibleTotals(snapshot)).toEqual({ [USER_A]: 2, [USER_B]: 1 })
  })

  it('undo targets the exact latest visible event', () => {
    const add = makeAddEventOp(USER_A, 30, 'a')
    const undo = makeDeleteLatestEventOp({ ...base, pendingOps: [add] }, USER_A, 'op:undo')

    expect(undo).toEqual({ id: 'op:undo', kind: 'delete-event', eventId: add.event.id })
    expect(projectEvents(base.baseEvents, [add, undo!])).toEqual(base.baseEvents)
  })

  it('does not reinterpret undo when server state shifts', () => {
    const undo = makeDeleteLatestEventOp(base, USER_A, 'op:undo')
    const shiftedServer = [...base.baseEvents, { id: 'server:3', who: USER_A, ts: 15 }]

    expect(projectEvents(shiftedServer, [undo!]).map((event) => event.id)).toEqual(['server:3', 'server:2'])
  })

  it('uses last pending theme write for local display', () => {
    expect(projectTheme('system', [makeThemeOp('dark', 'op:dark'), makeThemeOp('light', 'op:light')])).toBe('light')
  })

  it('settles acknowledged ops and replays remaining ops over canonical state', () => {
    const addA = makeAddEventOp(USER_A, 30, 'a')
    const addB = makeAddEventOp(USER_B, 40, 'b')
    const snapshot = { ...base, pendingOps: [addA, addB] }

    const settled = settleSnapshot(snapshot, {
      identity: USER_A,
      activeGroupId: 'group-1',
      groupMembers: [],
      events: [...base.baseEvents, addA.event],
      theme: 'system',
      palette: 'default',
      locale: 'pt',
      settled: [addA.id]
    })

    expect(settled.pendingOps).toEqual([addB])
    expect(projectEvents(settled.baseEvents, settled.pendingOps).map((event) => event.id)).toEqual(['server:1', 'server:2', addA.event.id, addB.event.id])
  })

  it('drops pending ops when the server has no identity', () => {
    const add = makeAddEventOp(USER_A, 30, 'a')
    const snapshot = { ...base, pendingOps: [add] }

    const settled = settleSnapshot(snapshot, {
      identity: null,
      activeGroupId: null,
      groupMembers: [],
      events: [],
      theme: 'system',
      palette: 'default',
      locale: 'pt',
      settled: []
    })

    expect(settled).toEqual({
      identity: null,
      activeGroupId: null,
      groupMembers: [],
      baseEvents: [],
      baseTheme: 'system',
      basePalette: 'default',
      baseLocale: 'pt',
      pendingOps: []
    })
  })
})
