'use client'

import { useOfflineRuntime, useOfflineState } from '../lib/offline-store'
import { NavBar } from './nav-bar'
import { OfflineSync } from './offline-sync'
import { PwaRegister } from './pwa-register'
import { StorageGate } from './storage-gate'

export function AppRuntime({ children }: { children: React.ReactNode }) {
  useOfflineRuntime()
  const state = useOfflineState()

  return (
    <>
      <div className='mx-auto flex w-full max-w-[420px] flex-1 flex-col overflow-hidden'>
        {state.storageError ?
          <StorageGate />
        : children}
      </div>
      {state.identity && !state.storageError && <NavBar who={state.identity} />}
      {!state.storageError && <OfflineSync />}
      <PwaRegister />
    </>
  )
}
