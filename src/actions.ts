'use server'

import { revalidatePath } from 'next/cache'
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

export async function syncEvents(ops: QueueOp[]): Promise<{ acked: string[]; my: number; total: number }> {
  const who = await readIdentity()
  if (!who) return { acked: [], my: 0, total: 0 }
  if (!Array.isArray(ops) || ops.length === 0) {
    const c = await counts()
    return { acked: [], my: c[who], total: c.henrique + c.pietra }
  }
  const acked = await applyEvents(who, ops)
  if (acked.length > 0) {
    revalidatePath('/')
    revalidatePath('/diary')
    revalidatePath('/scoreboard')
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
