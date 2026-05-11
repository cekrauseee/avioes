'use client'

import { useSyncExternalStore } from 'react'

type Listener = () => void

const locks = new Set<string>()
const listeners = new Set<Listener>()

function getSnapshot() {
  return locks.size > 0
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  for (const listener of listeners) listener()
}

export function setRouteGestureLock(id: string, locked: boolean) {
  const wasLocked = getSnapshot()
  if (locked) locks.add(id)
  else locks.delete(id)
  if (getSnapshot() !== wasLocked) emit()
}

export function useRouteGestureLock() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
