'use client'

import { NavDirectionProvider } from '../lib/nav-direction'
import { useOfflineRuntime, useOfflineState } from '../lib/offline-store'
import { NavBar } from './nav-bar'
import { OfflineSync } from './offline-sync'
import { PwaRegister } from './pwa-register'
import { StorageGate } from './storage-gate'
import { SwipeableContent } from './swipeable-content'

export function AppRuntime({ children }: { children: React.ReactNode }) {
  useOfflineRuntime()
  const state = useOfflineState()

  return (
    <NavDirectionProvider>
      <div
        className='mx-auto flex w-full max-w-[420px] flex-1 flex-col overflow-hidden transition-opacity duration-180 ease-out'
        style={{ opacity: state.localeFading ? 0 : 1 }}
      >
        {state.storageError ?
          <StorageGate />
        : <SwipeableContent>{children}</SwipeableContent>}
      </div>
      {state.identity && !state.storageError && <NavBar who={state.identity} />}
      {!state.storageError && <OfflineSync />}
      <PwaRegister />
    </NavDirectionProvider>
  )
}
