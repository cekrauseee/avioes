'use server'

import { requireBackofficeUser } from '@airplanes/auth/guards'
import {
  adminGetGroup,
  adminGetStats,
  adminGetUser,
  adminListGroups,
  adminListUsers,
  adminRemoveGroupMember,
  adminRestoreEvent,
  adminRestoreGroup,
  adminRestoreUser,
  adminSetFeatureFlags,
  adminSoftDeleteEvent,
  adminSoftDeleteGroup,
  adminSoftDeleteUser,
  adminUpdateGroup,
  adminUpdateUser
} from '@airplanes/db/store-admin'

export async function getStats() {
  await requireBackofficeUser('/')
  return adminGetStats()
}

export async function listUsers(opts: { search?: string; status?: string; cursor?: string }) {
  await requireBackofficeUser('/users')
  return adminListUsers({ ...opts, status: opts.status as 'active' | 'deleted' | 'all' })
}

export async function getUser(id: string) {
  await requireBackofficeUser(`/users/${id}`)
  return adminGetUser(id)
}

export async function updateUser(
  id: string,
  patch: {
    firstName?: string
    lastName?: string
    username?: string
    email?: string
    emailVerified?: boolean
    onboardingStatus?: string
  }
) {
  await requireBackofficeUser(`/users/${id}`)
  await adminUpdateUser(id, patch)
  return { ok: true }
}

export async function setFeatureFlags(id: string, flags: string[]) {
  await requireBackofficeUser(`/users/${id}`)
  await adminSetFeatureFlags(id, flags)
  return { ok: true }
}

export async function softDeleteUser(id: string) {
  await requireBackofficeUser(`/users/${id}`)
  return adminSoftDeleteUser(id)
}

export async function restoreUser(id: string) {
  await requireBackofficeUser(`/users/${id}`)
  await adminRestoreUser(id)
  return { ok: true }
}

export async function listGroups(opts: { search?: string; status?: string; cursor?: string }) {
  await requireBackofficeUser('/groups')
  return adminListGroups({ ...opts, status: opts.status as 'active' | 'deleted' | 'all' })
}

export async function getGroup(id: string) {
  await requireBackofficeUser(`/groups/${id}`)
  return adminGetGroup(id)
}

export async function updateGroup(id: string, patch: { name?: string; ownerId?: string }) {
  await requireBackofficeUser(`/groups/${id}`)
  await adminUpdateGroup(id, patch)
  return { ok: true }
}

export async function softDeleteGroup(id: string) {
  await requireBackofficeUser(`/groups/${id}`)
  await adminSoftDeleteGroup(id)
  return { ok: true }
}

export async function restoreGroup(id: string) {
  await requireBackofficeUser(`/groups/${id}`)
  await adminRestoreGroup(id)
  return { ok: true }
}

export async function removeGroupMember(groupId: string, userId: string) {
  await requireBackofficeUser(`/groups/${groupId}`)
  return adminRemoveGroupMember(groupId, userId)
}

export async function softDeleteEvent(eventId: number) {
  await requireBackofficeUser('/')
  await adminSoftDeleteEvent(eventId)
  return { ok: true }
}

export async function restoreEvent(eventId: number) {
  await requireBackofficeUser('/')
  await adminRestoreEvent(eventId)
  return { ok: true }
}
