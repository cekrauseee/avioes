'use client'

import { useSyncExternalStore } from 'react'
import type { Identity, QueueOp } from './types'

export type Queue = readonly QueueOp[]

const STORAGE_KEY = 'ap_queue'
const CHANNEL_NAME = 'ap_queue'
const EMPTY: Queue = Object.freeze([])

let cachedRaw: string | null | undefined = undefined
let cachedQueue: Queue = EMPTY

function read(): Queue {
  if (typeof window === 'undefined') return EMPTY
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === cachedRaw) return cachedQueue
  cachedRaw = raw
  if (!raw) {
    cachedQueue = EMPTY
    return cachedQueue
  }
  try {
    const parsed = JSON.parse(raw)
    cachedQueue = Array.isArray(parsed) ? (parsed as QueueOp[]) : EMPTY
  } catch {
    cachedQueue = EMPTY
  }
  return cachedQueue
}

const listeners = new Set<() => void>()
let bc: BroadcastChannel | null = null

function ensureChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null
  if (bc) return bc
  if (typeof BroadcastChannel === 'undefined') return null
  bc = new BroadcastChannel(CHANNEL_NAME)
  bc.addEventListener('message', () => {
    cachedRaw = undefined
    listeners.forEach((l) => l())
  })
  return bc
}

function notifyLocal() {
  cachedRaw = undefined
  listeners.forEach((l) => l())
  ensureChannel()?.postMessage(0)
}

function persist(next: Queue): void {
  if (typeof window === 'undefined') return
  if (next.length === 0) window.localStorage.removeItem(STORAGE_KEY)
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  notifyLocal()
}

function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      cachedRaw = undefined
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  ensureChannel()
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useQueue(): Queue {
  return useSyncExternalStore(subscribeQueue, read, () => EMPTY)
}

export function readQueue(): Queue {
  return read()
}

export function enqueueAdd(who: Identity): void {
  const q = read()
  const op: QueueOp = { id: crypto.randomUUID(), op: 'add', who, ts: Date.now() }
  persist([...q, op])
}

export function enqueueUndo(who: Identity): void {
  const q = read()
  for (let i = q.length - 1; i >= 0; i--) {
    const item = q[i]
    if (item.who !== who) continue
    if (item.op === 'add') {
      persist([...q.slice(0, i), ...q.slice(i + 1)])
      return
    }
    break
  }
  const op: QueueOp = { id: crypto.randomUUID(), op: 'undo', who }
  persist([...q, op])
}

export function dropOps(ids: readonly string[]): void {
  if (ids.length === 0) return
  const drop = new Set(ids)
  const q = read()
  const next = q.filter((op) => !drop.has(op.id))
  if (next.length === q.length) return
  persist(next)
}

export function deltaFor(queue: Queue, who: Identity): number {
  let d = 0
  for (const op of queue) {
    if (op.who !== who) continue
    d += op.op === 'add' ? 1 : -1
  }
  return d
}

export function totalDelta(queue: Queue): number {
  let d = 0
  for (const op of queue) d += op.op === 'add' ? 1 : -1
  return d
}

function readOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

function subscribeOnline(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, readOnline, () => true)
}
