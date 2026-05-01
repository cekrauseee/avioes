'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { deleteIdentity, readIdentity, writeIdentity } from './lib/cookies'
import { addEvent, deleteLastEvent, writeTheme } from './lib/store'
import type { Identity, Theme } from './lib/types'

export async function setIdentity(who: Identity) {
  if (who !== 'henrique' && who !== 'pietra') return
  await writeIdentity(who)
  redirect('/')
}

export async function clearIdentity() {
  await deleteIdentity()
  redirect('/')
}

export async function addAirplane() {
  const who = await readIdentity()
  if (!who) return
  await addEvent(who)
  revalidatePath('/')
  revalidatePath('/diary')
  revalidatePath('/scoreboard')
}

export async function undoLast() {
  const who = await readIdentity()
  if (!who) return
  await deleteLastEvent(who)
  revalidatePath('/')
  revalidatePath('/diary')
  revalidatePath('/scoreboard')
}

export async function setTheme(theme: Theme) {
  if (theme !== 'light' && theme !== 'dark' && theme !== 'system') return
  const who = await readIdentity()
  if (!who) return
  await writeTheme(who, theme)
  revalidatePath('/', 'layout')
}
