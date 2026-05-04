import 'server-only'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth, type Session } from './auth'
import { readActiveGroupId, readGroupMembership, writeActiveGroupId } from './store'

type User = Session['user']

const AUTH_ROUTE = '/auth'
const DEFAULT_AUTH_NEXT = '/'

export function safeNextPath(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return DEFAULT_AUTH_NEXT
  if (!raw.startsWith('/') || raw.startsWith('//')) return DEFAULT_AUTH_NEXT

  try {
    const url = new URL(raw, 'http://airplanes.local')
    if (url.origin !== 'http://airplanes.local') return DEFAULT_AUTH_NEXT
    if (url.pathname === AUTH_ROUTE) return DEFAULT_AUTH_NEXT
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return DEFAULT_AUTH_NEXT
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function requireUser(nextPath: string): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect(`${AUTH_ROUTE}?next=${encodeURIComponent(nextPath)}`)
  return user
}

export async function requireActiveGroup(nextPath: string): Promise<{ user: User; activeGroupId: string }> {
  const user = await requireUser(nextPath)
  const activeGroupId = await readActiveGroupId(user.id)
  if (!activeGroupId) redirect('/groups')
  const membership = await readGroupMembership(activeGroupId, user.id)
  if (!membership) {
    await writeActiveGroupId(user.id, null)
    redirect('/groups')
  }
  return { user, activeGroupId }
}

export async function requireGroupMember(groupId: string, nextPath: string): Promise<User> {
  const user = await requireUser(nextPath)
  const membership = await readGroupMembership(groupId, user.id)
  if (!membership) redirect('/groups')
  return user
}

export async function requireGroupOwner(groupId: string, nextPath: string): Promise<User> {
  const user = await requireUser(nextPath)
  const membership = await readGroupMembership(groupId, user.id)
  if (membership?.role !== 'owner') redirect('/groups')
  return user
}

export async function redirectAuthenticatedUser(nextPathValue: unknown): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const nextPath = safeNextPath(nextPathValue)
  if (nextPath === '/groups') redirect('/groups')

  const activeGroupId = await readActiveGroupId(user.id)
  if (!activeGroupId) redirect('/groups')
  const membership = await readGroupMembership(activeGroupId, user.id)
  if (!membership) {
    await writeActiveGroupId(user.id, null)
    redirect('/groups')
  }
  redirect(nextPath)
}
