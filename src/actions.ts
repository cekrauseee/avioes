'use server'

import { headers } from 'next/headers'
import { auth } from './lib/auth'
import type { SyncSnapshot } from './lib/offline-model'
import {
  addGroupMember,
  applyOps,
  createGroup,
  deleteGroup as deleteGroupInStore,
  findUserByEmail,
  leaveGroup as leaveGroupInStore,
  readActiveGroupId,
  readEvents,
  readGroup,
  readGroupMembers,
  readGroupsForUser,
  readLocale,
  readPalette,
  readTheme,
  removeGroupMember,
  updateGroup as updateGroupInStore,
  writeActiveGroupId
} from './lib/store'
import type { Group, GroupMember, PendingOp } from './lib/types'

const MAX_SYNC_OPS = 250
const MAX_FUTURE_TS_MS = 5 * 60 * 1000
const MAX_PAST_TS_MS = 7 * 24 * 60 * 60 * 1000

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function bootstrapState(): Promise<SyncSnapshot> {
  const user = await getSessionUser()
  if (!user) return emptySnapshot(null, null, [], [])

  const activeGroupId = await readActiveGroupId(user.id)
  if (!activeGroupId) return emptySnapshot(user.id, null, [], [])

  const [groupMembers, events, theme, palette, locale] = await Promise.all([
    readGroupMembers(activeGroupId),
    readEvents(activeGroupId),
    readTheme(user.id),
    readPalette(user.id),
    readLocale(user.id)
  ])

  return {
    identity: user.id,
    activeGroupId,
    groupMembers,
    events,
    theme,
    palette,
    locale,
    settled: []
  }
}

export async function syncOps(ops: unknown[]): Promise<SyncSnapshot> {
  const user = await getSessionUser()
  if (!user) return emptySnapshot(null, null, [], [])

  const activeGroupId = await readActiveGroupId(user.id)
  if (!activeGroupId) return emptySnapshot(user.id, null, [], [])

  const validOps: PendingOp[] = []
  const rejected: string[] = []
  const incoming = Array.isArray(ops) ? ops : []

  for (const op of incoming.slice(0, MAX_SYNC_OPS)) {
    if (isPendingOp(op, user.id)) validOps.push(op as PendingOp)
    else {
      const id = opId(op)
      if (id) rejected.push(id)
    }
  }

  const applied = validOps.length > 0 ? await applyOps(validOps, user.id, activeGroupId) : []

  const [groupMembers, events, theme, palette, locale] = await Promise.all([
    readGroupMembers(activeGroupId),
    readEvents(activeGroupId),
    readTheme(user.id),
    readPalette(user.id),
    readLocale(user.id)
  ])

  return {
    identity: user.id,
    activeGroupId,
    groupMembers,
    events,
    theme,
    palette,
    locale,
    settled: [...rejected, ...applied]
  }
}

export async function setActiveGroup(groupId: string): Promise<SyncSnapshot> {
  const user = await getSessionUser()
  if (!user) return emptySnapshot(null, null, [], [])

  const userGroups = await readGroupsForUser(user.id)
  if (!userGroups.find((g) => g.id === groupId)) return emptySnapshot(user.id, null, [], [])

  await writeActiveGroupId(user.id, groupId)

  const [groupMembers, events, theme, palette, locale] = await Promise.all([
    readGroupMembers(groupId),
    readEvents(groupId),
    readTheme(user.id),
    readPalette(user.id),
    readLocale(user.id)
  ])

  return {
    identity: user.id,
    activeGroupId: groupId,
    groupMembers,
    events,
    theme,
    palette,
    locale,
    settled: []
  }
}

export async function getUserGroups(): Promise<(Group & { memberCount: number })[]> {
  const user = await getSessionUser()
  if (!user) return []
  return readGroupsForUser(user.id)
}

export async function emailExists(email: string): Promise<boolean> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) return false
  const found = await findUserByEmail(trimmed)
  return found !== null
}

export async function createNewGroup(name: string): Promise<{ groupId: string } | { error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado' }
  if (!name.trim()) return { error: 'Nome inválido' }

  const groupId = crypto.randomUUID()
  await createGroup(groupId, name.trim(), user.id)
  await writeActiveGroupId(user.id, groupId)

  return { groupId }
}

export async function getGroupDetails(groupId: string): Promise<{ name: string; members: GroupMember[]; isOwner: boolean } | null> {
  const user = await getSessionUser()
  if (!user) return null

  const [group, members] = await Promise.all([readGroup(groupId), readGroupMembers(groupId)])
  if (!group) return null
  const isMember = members.some((m) => m.userId === user.id)
  if (!isMember) return null

  return { name: group.name, members, isOwner: members.find((m) => m.userId === user.id)?.role === 'owner' }
}

export async function updateGroup(groupId: string, updates: { name?: string }): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado' }

  const members = await readGroupMembers(groupId)
  const isOwner = members.find((m) => m.userId === user.id)?.role === 'owner'
  if (!isOwner) return { error: 'Apenas o dono pode editar' }

  const sanitized: { name?: string } = {}
  if (updates.name !== undefined) {
    const name = updates.name.trim()
    if (!name) return { error: 'Nome inválido' }
    if (name.length > 60) return { error: 'Nome muito longo' }
    sanitized.name = name
  }

  if (Object.keys(sanitized).length === 0) return { success: true }

  await updateGroupInStore(groupId, sanitized)
  return { success: true }
}

export async function lookupUserToAdd(
  groupId: string,
  email: string
): Promise<{ ok: true; name: string; email: string } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Não autenticado' }

  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) return { ok: false, error: 'E-mail inválido' }

  const members = await readGroupMembers(groupId)
  const isOwner = members.find((m) => m.userId === user.id)?.role === 'owner'
  if (!isOwner) return { ok: false, error: 'Apenas o dono pode adicionar membros' }

  const target = await findUserByEmail(trimmed)
  if (!target) return { ok: false, error: 'Usuário não encontrado' }

  if (members.some((m) => m.userId === target.id)) return { ok: false, error: 'Usuário já está no grupo' }

  return { ok: true, name: target.name, email: target.email }
}

export async function addMemberByEmail(groupId: string, email: string): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado' }

  const members = await readGroupMembers(groupId)
  const isOwner = members.find((m) => m.userId === user.id)?.role === 'owner'
  if (!isOwner) return { error: 'Apenas o dono pode adicionar membros' }

  const target = await findUserByEmail(email.trim().toLowerCase())
  if (!target) return { error: 'Usuário não encontrado' }

  if (members.some((m) => m.userId === target.id)) return { error: 'Usuário já está no grupo' }

  await addGroupMember(groupId, target.id)
  return { success: true }
}

export async function deleteGroup(groupId: string): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado' }

  const members = await readGroupMembers(groupId)
  const isOwner = members.find((m) => m.userId === user.id)?.role === 'owner'
  if (!isOwner) return { error: 'Apenas o dono pode excluir' }

  await deleteGroupInStore(groupId)
  return { success: true }
}

export async function leaveGroup(groupId: string): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado' }

  const members = await readGroupMembers(groupId)
  const target = members.find((m) => m.userId === user.id)
  if (!target) return { error: 'Você não está nesse grupo' }
  if (target.role === 'owner') return { error: 'O dono precisa excluir o grupo, não pode apenas sair' }

  await leaveGroupInStore(groupId, user.id)
  return { success: true }
}

export async function removeMember(groupId: string, userId: string): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado' }

  const members = await readGroupMembers(groupId)
  const isOwner = members.find((m) => m.userId === user.id)?.role === 'owner'
  if (!isOwner && user.id !== userId) return { error: 'Sem permissão' }

  const target = members.find((m) => m.userId === userId)
  if (!target) return { error: 'Membro não encontrado' }
  if (target.role === 'owner') return { error: 'Não é possível remover o dono' }

  await removeGroupMember(groupId, userId)
  return { success: true }
}

function emptySnapshot(identity: string | null, activeGroupId: string | null, groupMembers: GroupMember[], settled: string[]): SyncSnapshot {
  return { identity, activeGroupId, groupMembers, events: [], theme: 'system', palette: 'default', locale: 'pt', settled }
}

function opId(op: unknown): string | null {
  return typeof op === 'object' && op !== null && typeof (op as { id?: unknown }).id === 'string' ? (op as { id: string }).id : null
}

function isPendingOp(op: unknown, userId: string): boolean {
  if (typeof op !== 'object' || op === null) return false
  const item = op as { id?: unknown; kind?: unknown; event?: unknown; eventId?: unknown; theme?: unknown; palette?: unknown; locale?: unknown }
  if (typeof item.id !== 'string') return false
  if (item.kind === 'add-event') {
    const event = item.event as { id?: unknown; who?: unknown; ts?: unknown } | null
    const now = Date.now()
    return (
      typeof event === 'object' &&
      event !== null &&
      typeof event.id === 'string' &&
      event.who === userId &&
      typeof event.ts === 'number' &&
      Number.isFinite(event.ts) &&
      event.ts >= now - MAX_PAST_TS_MS &&
      event.ts <= now + MAX_FUTURE_TS_MS
    )
  }
  if (item.kind === 'delete-event') return typeof item.eventId === 'string'
  if (item.kind === 'set-theme') return item.theme === 'light' || item.theme === 'dark' || item.theme === 'system'
  if (item.kind === 'set-palette')
    return item.palette === 'default' || item.palette === 'ocean' || item.palette === 'lavender' || item.palette === 'earth' || item.palette === 'blossom' || item.palette === 'sky'
  if (item.kind === 'set-locale') return item.locale === 'pt' || item.locale === 'en'
  return false
}
