'use client'

import { useEffect, useTransition } from 'react'
import { bootstrapState } from '../actions'
import { applyServerSnapshot, useOfflineState } from '../lib/offline-store'
import { GroupsScreen } from './groups-screen'
import { OfflineGate } from './offline-gate'

export function Onboarding() {
  const state = useOfflineState()
  const [, start] = useTransition()

  useEffect(() => {
    if (!state.hydrated) return
    start(async () => {
      try {
        const snapshot = await bootstrapState()
        applyServerSnapshot(snapshot)
      } catch {}
    })
  }, [state.hydrated])

  return (
    <>
      <div className='online-only'>
        {!state.hydrated ?
          null
        : !state.identity ?
          null
        : !state.activeGroupId ?
          <GroupsScreen />
        : null}
      </div>
      <div className='offline-only'>
        <OfflineGate />
      </div>
    </>
  )
}
