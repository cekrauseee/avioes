'use server'

import crypto from 'crypto'
import { headers } from 'next/headers'
import { auth } from './lib/auth'
import { sendInviteEmail, sendPasswordEmail } from './lib/email'
import type { SyncSnapshot } from './lib/offline-model'
import {
  acceptInvitation as acceptInvitationInStore,
  applyOps,
  cancelInvitation as cancelInvitationInStore,
  consumePasswordToken,
  countRecentPasswordSends,
  createGroup,
  createOrReplaceInvitation,
  createPasswordToken,
  deleteGroup as deleteGroupInStore,
  findUserByEmail,
  getCredentialPasswordHash,
  leaveGroup as leaveGroupInStore,
  readActiveGroupId,
  readEventsForMember,
  readGroupForMember,
  readGroupMembersForMember,
  readGroupMembership,
  readGroupsForUser,
  readInvitationByToken,
  readLocale,
  readPalette,
  readPendingInvitationsForGroup,
  readTheme,
  recordPasswordAttempt,
  rejectInvitation as rejectInvitationInStore,
  removeGroupMember,
  updateGroup as updateGroupInStore,
  userHasCredentialAccount,
  userHasPasskeys as userHasPasskeysInStore,
  validatePasswordToken,
  writeActiveGroupId
} from './lib/store'
import type { Group, GroupMember, PendingOp } from './lib/types'

const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000
const MAX_INVITES_PER_HOUR = 10
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

  return snapshotForMember(user.id, activeGroupId, [], true)
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

  const membership = await readGroupMembership(activeGroupId, user.id)
  if (!membership) {
    await writeActiveGroupId(user.id, null)
    return emptySnapshot(user.id, null, [], rejected)
  }

  const applied = validOps.length > 0 ? await applyOps(validOps, user.id, activeGroupId) : []
  return snapshotForMember(user.id, activeGroupId, [...rejected, ...applied], true)
}

export async function setActiveGroup(groupId: string): Promise<SyncSnapshot> {
  const user = await getSessionUser()
  if (!user) return emptySnapshot(null, null, [], [])

  const membership = await readGroupMembership(groupId, user.id)
  if (!membership) return emptySnapshot(user.id, null, [], [])

  await writeActiveGroupId(user.id, groupId)
  return snapshotForMember(user.id, groupId, [], true)
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

  const membership = await readGroupMembership(groupId, user.id)
  if (!membership) return null

  const [group, members] = await Promise.all([readGroupForMember(groupId, user.id), readGroupMembersForMember(groupId, user.id)])
  if (!group) return null

  return { name: group.name, members, isOwner: membership.role === 'owner' }
}

export async function updateGroup(groupId: string, updates: { name?: string }): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado' }

  const membership = await readGroupMembership(groupId, user.id)
  if (membership?.role !== 'owner') return { error: 'Apenas o dono pode editar' }

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

// --- Invitations ---

function hashInviteToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function createInvitation(
  groupId: string,
  email: string
): Promise<{ ok: true; token: string; inviteUrl: string } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Não autenticado' }

  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) return { ok: false, error: 'E-mail inválido' }

  const membership = await readGroupMembership(groupId, user.id)
  if (membership?.role !== 'owner') return { ok: false, error: 'Apenas o dono pode convidar' }

  const existingMember = await findUserByEmail(trimmed)
  if (existingMember && (await readGroupMembership(groupId, existingMember.id))) {
    return { ok: false, error: 'already_member' }
  }

  const group = await readGroupForMember(groupId, user.id)
  if (!group) return { ok: false, error: 'Grupo não encontrado' }

  const id = crypto.randomUUID()
  const token = crypto.randomUUID()
  const tokenHash = hashInviteToken(token)
  const expiresAt = Date.now() + INVITE_EXPIRY_MS
  const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/invite/${token}`

  const result = await createOrReplaceInvitation({
    id,
    tokenHash,
    groupId,
    invitedEmail: trimmed,
    invitedByUserId: user.id,
    expiresAt,
    maxPerHour: MAX_INVITES_PER_HOUR
  })
  if (!result.ok) return result

  const inviterName = user.firstName ?? user.name.split(' ')[0] ?? user.name
  try {
    await sendInviteEmail(trimmed, inviterName, group.name, inviteUrl)
  } catch {
    // email send failure is not fatal — user can share the link manually
  }

  return { ok: true, token, inviteUrl }
}

export async function acceptInvitation(
  token: string
): Promise<{ ok: true; groupId: string; groupName: string; snapshot: SyncSnapshot } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Não autenticado' }
  if (!user.emailVerified) return { ok: false, error: 'email_not_verified' }

  const inv = await readInvitationByToken(token)
  if (!inv) return { ok: false, error: 'not_found' }
  if (user.email.toLowerCase() !== inv.invitedEmail.toLowerCase()) {
    return { ok: false, error: 'email_mismatch' }
  }

  const result = await acceptInvitationInStore(token, user.id)
  if (!result.ok) return result

  const snapshot = await snapshotForMember(user.id, result.groupId, [], true)
  return { ok: true, groupId: result.groupId, groupName: result.groupName, snapshot }
}

export async function rejectInvitation(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Não autenticado' }
  if (!user.emailVerified) return { ok: false, error: 'email_not_verified' }

  const inv = await readInvitationByToken(token)
  if (!inv) return { ok: false, error: 'not_found' }
  if (user.email.toLowerCase() !== inv.invitedEmail.toLowerCase()) {
    return { ok: false, error: 'email_mismatch' }
  }

  return rejectInvitationInStore(token)
}

export async function cancelInvitation(groupId: string, invitationId: string): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado' }

  const membership = await readGroupMembership(groupId, user.id)
  if (membership?.role !== 'owner') return { error: 'Apenas o dono pode cancelar convites' }

  await cancelInvitationInStore(groupId, invitationId)
  return { success: true }
}

export async function getGroupDetailsWithInvites(groupId: string): Promise<{
  name: string
  members: GroupMember[]
  isOwner: boolean
  pendingInvitations: { id: string; invitedEmail: string; createdAt: number; expiresAt: number }[]
} | null> {
  const user = await getSessionUser()
  if (!user) return null

  const membership = await readGroupMembership(groupId, user.id)
  if (!membership) return null

  const [group, members] = await Promise.all([readGroupForMember(groupId, user.id), readGroupMembersForMember(groupId, user.id)])
  if (!group) return null

  const isOwner = membership.role === 'owner'
  const pendingInvitations = isOwner ? await readPendingInvitationsForGroup(groupId) : []

  return { name: group.name, members, isOwner, pendingInvitations }
}

export async function deleteGroup(groupId: string): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado' }

  const membership = await readGroupMembership(groupId, user.id)
  if (membership?.role !== 'owner') return { error: 'Apenas o dono pode excluir' }

  await deleteGroupInStore(groupId)
  return { success: true }
}

export async function leaveGroup(groupId: string): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado' }

  const membership = await readGroupMembership(groupId, user.id)
  if (!membership) return { error: 'Você não está nesse grupo' }
  if (membership.role === 'owner') return { error: 'O dono precisa excluir o grupo, não pode apenas sair' }

  await leaveGroupInStore(groupId, user.id)
  return { success: true }
}

export async function removeMember(groupId: string, userId: string): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado' }

  const actor = await readGroupMembership(groupId, user.id)
  if (!actor) return { error: 'Sem permissão' }
  if (actor.role !== 'owner' && user.id !== userId) return { error: 'Sem permissão' }

  const target = await readGroupMembership(groupId, userId)
  if (!target) return { error: 'Membro não encontrado' }
  if (target.role === 'owner') return { error: 'Não é possível remover o dono' }

  await removeGroupMember(groupId, userId)
  return { success: true }
}

function emptySnapshot(identity: string | null, activeGroupId: string | null, groupMembers: GroupMember[], settled: string[]): SyncSnapshot {
  return { identity, activeGroupId, groupMembers, events: [], theme: 'system', palette: 'default', locale: 'pt', settled }
}

async function snapshotForMember(userId: string, groupId: string, settled: string[], clearStaleActiveGroup: boolean): Promise<SyncSnapshot> {
  const membership = await readGroupMembership(groupId, userId)
  if (!membership) {
    if (clearStaleActiveGroup) await writeActiveGroupId(userId, null)
    return emptySnapshot(userId, null, [], settled)
  }

  const [groupMembers, events, theme, palette, locale] = await Promise.all([
    readGroupMembersForMember(groupId, userId),
    readEventsForMember(groupId, userId),
    readTheme(userId),
    readPalette(userId),
    readLocale(userId)
  ])

  if (!groupMembers.some((m) => m.userId === userId)) {
    if (clearStaleActiveGroup) await writeActiveGroupId(userId, null)
    return emptySnapshot(userId, null, [], settled)
  }

  return {
    identity: userId,
    activeGroupId: groupId,
    groupMembers,
    events,
    theme,
    palette,
    locale,
    settled
  }
}

export async function setNewPassword(newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Não autenticado.' }
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return { ok: false, error: 'Senha precisa ter entre 8 e 128 caracteres.' }
  }
  try {
    await auth.api.setPassword({
      body: { newPassword },
      headers: await headers()
    })
    return { ok: true }
  } catch {
    return { ok: false, error: 'Não foi possível criar a senha.' }
  }
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
    return (
      item.palette === 'default' ||
      item.palette === 'ocean' ||
      item.palette === 'lavender' ||
      item.palette === 'earth' ||
      item.palette === 'blossom' ||
      item.palette === 'sky'
    )
  if (item.kind === 'set-locale') return item.locale === 'pt' || item.locale === 'en'
  return false
}

// --- Password token actions ---

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function userHasPassword(email: string): Promise<boolean> {
  return userHasCredentialAccount(email.trim().toLowerCase())
}

export async function checkUserHasPasskey(email: string): Promise<boolean> {
  return userHasPasskeysInStore(email.trim().toLowerCase())
}

export async function getEmailAuthState(email: string): Promise<{ exists: boolean; hasPassword: boolean; hasPasskey: boolean }> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) return { exists: false, hasPassword: false, hasPasskey: false }
  const [user, hasPassword, hasPasskey] = await Promise.all([findUserByEmail(trimmed), userHasCredentialAccount(trimmed), userHasPasskeysInStore(trimmed)])
  const exists = user !== null
  return { exists, hasPassword: exists && hasPassword, hasPasskey: exists && hasPasskey }
}

export async function requestPasswordChange(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Não autenticado.' }

  const locale = await readLocale(user.id)
  const token = await createPasswordToken(user.email, 'change')
  const url = `${BETTER_AUTH_URL}/settings/password/verify/${token}`

  try {
    await sendPasswordEmail(user.email, 'change', url, locale)
  } catch {
    return { ok: false, error: 'Não foi possível enviar o e-mail.' }
  }
  return { ok: true }
}

export async function requestPasswordCreation(reason?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Não autenticado.' }

  const hasCredential = await userHasCredentialAccount(user.email)
  if (hasCredential) return { ok: false, error: 'Você já possui uma senha.' }

  const locale = await readLocale(user.id)
  const token = await createPasswordToken(user.email, 'create')
  const reasonParam = reason === 'google' ? '?reason=google' : ''
  const url = `${BETTER_AUTH_URL}/password/create/${token}${reasonParam}`

  try {
    await sendPasswordEmail(user.email, 'create', url, locale)
  } catch {
    return { ok: false, error: 'Não foi possível enviar o e-mail.' }
  }
  return { ok: true }
}

export async function requestPasswordCreationForEmail(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!email || typeof email !== 'string') return { ok: true }
  const normalized = email.trim().toLowerCase()

  const recentCount = await countRecentPasswordSends(normalized, 'create')
  if (recentCount >= 3) return { ok: true }

  const user = await findUserByEmail(normalized)
  if (!user) return { ok: true }

  const hasCredential = await userHasCredentialAccount(normalized)
  if (hasCredential) return { ok: true }

  const locale = await readLocale(user.id)
  const token = await createPasswordToken(normalized, 'create')
  const url = `${BETTER_AUTH_URL}/password/create/${token}`

  try {
    await sendPasswordEmail(normalized, 'create', url, locale)
  } catch {
    // Swallow — don't reveal failures for unauthenticated flow
  }
  return { ok: true }
}

export async function consumePasswordCreationToken(token: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!token || typeof token !== 'string') return { ok: false, error: 'Token inválido.' }
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return { ok: false, error: 'Senha precisa ter entre 8 e 128 caracteres.' }
  }

  const result = await validatePasswordToken(token, 'create')
  if (!result) return { ok: false, error: 'Token inválido ou expirado.' }

  // Atomically claim the token — prevents concurrent double-submit
  const claimed = await consumePasswordToken(token, 'create')
  if (!claimed) return { ok: false, error: 'Token inválido ou expirado.' }

  const user = await findUserByEmail(result.email)
  if (!user) return { ok: false, error: 'Usuário não encontrado.' }

  const hasCredential = await userHasCredentialAccount(result.email)
  if (hasCredential) return { ok: false, error: 'Você já possui uma senha.' }

  // Try session-based setPassword (user is logged in)
  const session = await getSessionUser()
  if (session && session.email.toLowerCase() === result.email) {
    try {
      await auth.api.setPassword({
        body: { newPassword },
        headers: await headers()
      })
      return { ok: true }
    } catch {
      return { ok: false, error: 'Não foi possível criar a senha.' }
    }
  }

  // Not authenticated — create credential account directly
  try {
    const { hashPassword } = await import('better-auth/crypto')
    const { createCredentialAccount } = await import('./lib/store')
    const passwordHash = await hashPassword(newPassword)
    const created = await createCredentialAccount(user.id, passwordHash)
    if (!created) return { ok: false, error: 'Você já possui uma senha.' }
  } catch {
    return { ok: false, error: 'Não foi possível criar a senha.' }
  }

  return { ok: true }
}

export async function consumePasswordChangeToken(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!token || typeof token !== 'string') return { ok: false, error: 'Token inválido.' }
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return { ok: false, error: 'Senha precisa ter entre 8 e 128 caracteres.' }
  }

  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Não autenticado.' }

  const result = await validatePasswordToken(token, 'change')
  if (!result) return { ok: false, error: 'Token inválido ou expirado.' }
  if (result.email !== user.email.toLowerCase()) return { ok: false, error: 'Token inválido.' }

  const hash = await getCredentialPasswordHash(user.email)
  if (!hash) return { ok: false, error: 'Conta sem senha.' }

  const { verifyPassword } = await import('better-auth/crypto')
  const valid = await verifyPassword({ hash, password: currentPassword })
  if (!valid) {
    const { blocked } = await recordPasswordAttempt(token, 'change')
    if (blocked) return { ok: false, error: 'Muitas tentativas. Solicite um novo link.' }
    return { ok: false, error: 'Senha atual incorreta.' }
  }

  const claimed = await consumePasswordToken(token, 'change')
  if (!claimed) return { ok: false, error: 'Token já utilizado.' }

  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: await headers()
    })
  } catch {
    return { ok: false, error: 'Erro ao alterar senha. Solicite um novo link.' }
  }
  return { ok: true }
}
