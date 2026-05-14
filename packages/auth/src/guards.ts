import 'server-only'

import { isUserActive, readActiveGroupId, readGroupMembership, readOnboardingStatus, writeActiveGroupId } from '@airplanes/db/store'
import { getSessionCookie } from 'better-auth/cookies'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth, type Session } from './server'

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
  const h = await headers()
  if (!getSessionCookie(h)) return null
  const session = await auth.api.getSession({ headers: h })
  const user = session?.user ?? null
  if (!user) return null
  if (!(await isUserActive(user.id))) {
    await auth.api.signOut({ headers: h })
    return null
  }
  return user
}

export async function requireUser(nextPath: string): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect(`${AUTH_ROUTE}?next=${encodeURIComponent(nextPath)}`)
  return user
}

export async function requireOnboardedUser(nextPath: string): Promise<User> {
  const user = await requireUser(nextPath)
  const status = await readOnboardingStatus(user.id)
  if (status === 'pending') redirect('/onboarding')
  return user
}

export async function requireActiveGroup(nextPath: string): Promise<User> {
  const user = await requireOnboardedUser(nextPath)
  const activeGroupId = await readActiveGroupId(user.id)
  if (!activeGroupId) redirect('/groups')
  const membership = await readGroupMembership(activeGroupId, user.id)
  if (!membership) {
    await writeActiveGroupId(user.id, null)
    redirect('/groups')
  }
  return user
}

export async function requireGroupMember(groupId: string, nextPath: string): Promise<User> {
  const user = await requireOnboardedUser(nextPath)
  const membership = await readGroupMembership(groupId, user.id)
  if (!membership) redirect('/groups')
  return user
}

export async function requireGroupOwner(groupId: string, nextPath: string): Promise<User> {
  const user = await requireOnboardedUser(nextPath)
  const membership = await readGroupMembership(groupId, user.id)
  if (membership?.role !== 'owner') redirect('/groups')
  return user
}

export async function requireBackofficeUser(nextPath: string): Promise<User> {
  const user = await requireUser(nextPath)
  const flags = (user as User & { featureFlags?: string[] }).featureFlags ?? []
  if (!flags.includes('backoffice')) {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}&error=no_access`)
  }
  return user
}

export async function redirectAuthenticatedUser(nextPathValue: unknown): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const nextPath = safeNextPath(nextPathValue)
  if (nextPath.startsWith('/invite/')) redirect(nextPath)
  if (nextPath === '/groups') redirect('/groups')

  const activeGroupId = await readActiveGroupId(user.id)
  if (!activeGroupId) redirect('/')
  const membership = await readGroupMembership(activeGroupId, user.id)
  if (!membership) {
    await writeActiveGroupId(user.id, null)
    redirect('/')
  }
  redirect(nextPath)
}
