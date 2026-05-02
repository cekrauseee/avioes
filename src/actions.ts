'use server'

import { refresh, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { deleteIdentity, readIdentity, writeIdentity } from './lib/cookies'
import { applyEvents, counts, writeTheme } from './lib/store'
import type { Identity, QueueOp, Theme } from './lib/types'

export async function setIdentity(who: Identity) {
  if (who !== 'henrique' && who !== 'pietra') return
  await writeIdentity(who)
  redirect('/')
}

export async function clearIdentity() {
  await deleteIdentity()
  redirect('/')
}

function isIdentity(v: unknown): v is Identity {
  return v === 'henrique' || v === 'pietra'
}

function opId(op: unknown): string | null {
  return typeof op === 'object' && op !== null && typeof (op as { id?: unknown }).id === 'string' ? (op as { id: string }).id : null
}

function isQueueOp(op: unknown): op is QueueOp {
  if (typeof op !== 'object' || op === null) return false
  const item = op as { id?: unknown; op?: unknown; who?: unknown; ts?: unknown }
  if (typeof item.id !== 'string' || !isIdentity(item.who)) return false
  if (item.op === 'add') return Number.isFinite(item.ts)
  return item.op === 'undo'
}

export async function syncEvents(ops: unknown[]): Promise<{ acked: string[]; my: number; total: number }> {
  const who = await readIdentity()
  if (!who) return { acked: [], my: 0, total: 0 }
  const validOps: QueueOp[] = []
  const rejected: string[] = []
  for (const op of Array.isArray(ops) ? ops : []) {
    if (isQueueOp(op)) validOps.push(op)
    else {
      const id = opId(op)
      if (id) rejected.push(id)
    }
  }
  if (validOps.length === 0) {
    const c = await counts()
    return { acked: rejected, my: c[who], total: c.henrique + c.pietra }
  }
  const applied = await applyEvents(validOps)
  const acked = [...rejected, ...applied]
  if (applied.length > 0) {
    revalidatePath('/')
    revalidatePath('/diary')
    revalidatePath('/scoreboard')
    refresh()
  }
  const c = await counts()
  return { acked, my: c[who], total: c.henrique + c.pietra }
}

export async function setTheme(theme: Theme) {
  if (theme !== 'light' && theme !== 'dark' && theme !== 'system') return
  const who = await readIdentity()
  if (!who) return
  await writeTheme(who, theme)
  revalidatePath('/', 'layout')
}
