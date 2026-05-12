'use server'

import { del, put } from '@vercel/blob'
import { getSessionCookie } from 'better-auth/cookies'
import crypto from 'crypto'
import { headers } from 'next/headers'
import { auth, consumeOtpSendError, withOtpErrorScope } from './lib/auth'
import { isCountryCode } from './lib/countries'
import { sendInviteEmail, sendPasswordEmail } from './lib/email'
import type { SyncSnapshot } from './lib/offline-model'
import { checkRateLimit } from './lib/rate-limit'
import type { UserProfile } from './lib/store'
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
  isUsernameTaken,
  leaveGroup as leaveGroupInStore,
  readActiveGroupId,
  readEventsForMember,
  readGroupForMember,
  readGroupMembersForMember,
  readGroupMembership,
  readGroupsForUser,
  readInvitationByToken,
  readLocale,
  readOnboardingStatus,
  readPalette,
  readPendingInvitationsForGroup,
  readTheme,
  readUserProfile,
  readWorldRanking,
  recordPasswordAttempt,
  rejectInvitation as rejectInvitationInStore,
  removeGroupMember,
  updateGroup as updateGroupInStore,
  updateUserProfile,
  userHasCredentialAccount,
  userHasPasskeys as userHasPasskeysInStore,
  usernameExists,
  validatePasswordToken,
  writeActiveGroupId,
  writeOnboardingStatus
} from './lib/store'
import type { Group, GroupMember, OnboardingStatus, PendingOp } from './lib/types'
import { startOfWeekBRT } from './lib/world-window'

export type WorldRankingWindow = 'all' | 'week'

export type WorldRankingRowDTO = {
  rank: number
  groupId: string
  displayName: string
  score: number
  isMember: boolean
}

export type WorldRankingResult = {
  window: WorldRankingWindow
  rows: WorldRankingRowDTO[]
  userGroupRanks: { groupId: string; displayName: string; rank: number; score: number }[]
}

const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000
const MAX_INVITES_PER_HOUR = 10
const MAX_SYNC_OPS = 250
const MAX_FUTURE_TS_MS = 5 * 60 * 1000
const MAX_PAST_TS_MS = 7 * 24 * 60 * 60 * 1000
const MAX_GROUPS_PER_USER = 20
const MAX_MEMBERS_PER_GROUP = 50
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

async function getSessionUser() {
  const h = await headers()
  if (!getSessionCookie(h)) return null
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

async function getClientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown'
}

export async function bootstrapState(): Promise<SyncSnapshot> {
  const user = await getSessionUser()
  if (!user) return emptySnapshot(null, null, [], [], 'complete')

  const [activeGroupId, onboardingStatus] = await Promise.all([readActiveGroupId(user.id), readOnboardingStatus(user.id)])
  if (!activeGroupId) return emptySnapshot(user.id, null, [], [], onboardingStatus)

  return snapshotForMember(user.id, activeGroupId, [], true, onboardingStatus)
}

export async function syncOps(ops: unknown[]): Promise<SyncSnapshot> {
  const user = await getSessionUser()
  if (!user) return emptySnapshot(null, null, [], [], 'complete')

  const [activeGroupId, onboardingStatus] = await Promise.all([readActiveGroupId(user.id), readOnboardingStatus(user.id)])
  if (!activeGroupId) return emptySnapshot(user.id, null, [], [], onboardingStatus)

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
    return emptySnapshot(user.id, null, [], rejected, onboardingStatus)
  }

  const applied = validOps.length > 0 ? await applyOps(validOps, user.id, activeGroupId) : []
  return snapshotForMember(user.id, activeGroupId, [...rejected, ...applied], true, onboardingStatus)
}

export async function setActiveGroup(groupId: string): Promise<SyncSnapshot> {
  const user = await getSessionUser()
  if (!user) return emptySnapshot(null, null, [], [], 'complete')

  const membership = await readGroupMembership(groupId, user.id)
  if (!membership) return emptySnapshot(user.id, null, [], [], 'complete')

  await writeActiveGroupId(user.id, groupId)
  const onboardingStatus = await readOnboardingStatus(user.id)
  return snapshotForMember(user.id, groupId, [], true, onboardingStatus)
}

export type OnboardingState = {
  email: string
  firstName: string | null
  lastName: string | null
  username: string | null
  image: string | null
  suggestedUsernames: string[]
}

export async function getOnboardingState(): Promise<OnboardingState | null> {
  const user = await getSessionUser()
  if (!user) return null

  const profile = await readUserProfile(user.id)
  if (!profile) return null

  const rawFirstName = user.firstName ?? null
  const firstName = rawFirstName && rawFirstName.trim().length > 0 ? rawFirstName : null
  const rawLastName = user.lastName ?? null
  const lastName = rawLastName && rawLastName.trim().length > 0 ? rawLastName : null

  const { suggestions } = await suggestUsernamesForSignup(profile.email, firstName ?? '')
  return {
    email: profile.email,
    firstName,
    lastName,
    username: profile.username,
    image: profile.image,
    suggestedUsernames: suggestions
  }
}

export async function saveOnboardingProfile(input: {
  firstName: string
  lastName: string | null
  username: string
  image: string | null
}): Promise<{ ok: true } | { ok: false; error: 'username_taken' | 'username_invalid' | 'first_name_required' | 'image_invalid' | 'unknown' }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'unknown' }

  const firstName = input.firstName.trim()
  if (!firstName) return { ok: false, error: 'first_name_required' }
  if (firstName.length > 60) return { ok: false, error: 'first_name_required' }

  const lastNameRaw = (input.lastName ?? '').trim()
  const lastName = lastNameRaw.length === 0 ? null : lastNameRaw.slice(0, 60)

  const username = input.username.trim().toLowerCase()
  if (!USERNAME_RE.test(username)) return { ok: false, error: 'username_invalid' }
  if (await isUsernameTaken(username, user.id)) return { ok: false, error: 'username_taken' }

  const previous = await readUserProfile(user.id)
  const imageCheck = validateProfileImage(input.image, user.id, previous?.image ?? null)
  if (!imageCheck.ok) return { ok: false, error: 'image_invalid' }
  const image = imageCheck.value

  const result = await updateUserProfile(user.id, {
    firstName,
    lastName,
    username,
    image,
    country: previous?.country ?? null,
    city: previous?.city ?? null
  })
  if (!result.ok) return { ok: false, error: result.reason }

  const previousImage = previous?.image ?? null
  if (previousImage && previousImage !== image && isOwnedProfileBlob(previousImage, user.id)) {
    await deleteBlobQuiet(previousImage)
  }

  return { ok: true }
}

export async function finishOnboarding(input: {
  groupName: string
}): Promise<{ ok: true; snapshot: SyncSnapshot } | { ok: false; error: 'name_invalid' | 'profile_incomplete' | 'unknown' }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'unknown' }

  const name = input.groupName.trim()
  if (!name) return { ok: false, error: 'name_invalid' }
  if (name.length > 60) return { ok: false, error: 'name_invalid' }

  const profile = await readUserProfile(user.id)
  if (!profile || !profile.username) return { ok: false, error: 'profile_incomplete' }

  const groupId = crypto.randomUUID()
  await createGroup(groupId, name, user.id)
  await writeActiveGroupId(user.id, groupId)
  await writeOnboardingStatus(user.id, 'complete')

  const snapshot = await snapshotForMember(user.id, groupId, [], true, 'complete')
  return { ok: true, snapshot }
}

export async function getWorldRanking(opts: { window: WorldRankingWindow }): Promise<WorldRankingResult> {
  const window: WorldRankingWindow = opts?.window === 'week' ? 'week' : 'all'

  const user = await getSessionUser()
  if (!user) return { window, rows: [], userGroupRanks: [] }

  const weekStartTs = window === 'week' ? startOfWeekBRT(Date.now()) : undefined
  const ranking = await readWorldRanking({ window, weekStartTs })
  const memberIds = new Set((await readGroupsForUser(user.id)).map((g) => g.id))

  const rows: WorldRankingRowDTO[] = ranking.map((r, i) => {
    const isMember = memberIds.has(r.groupId)
    return {
      rank: i + 1,
      groupId: r.groupId,
      displayName: r.name,
      score: r.score,
      isMember
    }
  })

  return {
    window,
    rows,
    userGroupRanks: rows.filter((r) => r.isMember).map(({ groupId, displayName, rank, score }) => ({ groupId, displayName, rank, score }))
  }
}

export async function getUserGroups(): Promise<(Group & { memberCount: number })[]> {
  const user = await getSessionUser()
  if (!user) return []
  return readGroupsForUser(user.id)
}

export async function emailExists(email: string): Promise<boolean> {
  const ip = await getClientIp()
  if (!checkRateLimit(`email-exists:${ip}`, 20, 60_000)) return false
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) return false
  const found = await findUserByEmail(trimmed)
  return found !== null
}

export async function createNewGroup(name: string): Promise<{ groupId: string } | { error: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado' }
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Nome inválido' }
  if (trimmed.length > 60) return { error: 'Nome muito longo' }

  const existing = await readGroupsForUser(user.id)
  if (existing.length >= MAX_GROUPS_PER_USER) return { error: 'Limite de grupos atingido' }

  const groupId = crypto.randomUUID()
  await createGroup(groupId, trimmed, user.id)
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

export async function createInvitation(groupId: string, email: string): Promise<{ ok: true; inviteUrl: string } | { ok: false; error: string }> {
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

  const members = await readGroupMembersForMember(groupId, user.id)
  if (members.length >= MAX_MEMBERS_PER_GROUP) return { ok: false, error: 'Limite de membros atingido' }

  const id = crypto.randomUUID()
  const token = crypto.randomUUID()
  const tokenHash = hashInviteToken(token)
  const expiresAt = Date.now() + INVITE_EXPIRY_MS
  const inviteUrl = `${BETTER_AUTH_URL}/invite/${token}`

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

  return { ok: true, inviteUrl }
}

export async function sendInvitationEmail(groupId: string, email: string, inviteUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  const membership = await readGroupMembership(groupId, user.id)
  if (membership?.role !== 'owner') return { ok: false, error: 'not_owner' }

  let token: string
  try {
    const parsed = new URL(inviteUrl)
    const match = parsed.pathname.match(/^\/invite\/([a-f0-9-]+)$/)
    if (!match) return { ok: false, error: 'invalid_url' }
    token = match[1]
  } catch {
    return { ok: false, error: 'invalid_url' }
  }

  const invite = await readInvitationByToken(token)
  if (!invite || invite.groupId !== groupId || invite.status !== 'pending') {
    return { ok: false, error: 'invalid_invite' }
  }

  const group = await readGroupForMember(groupId, user.id)
  if (!group) return { ok: false, error: 'group_not_found' }

  const safeUrl = `${BETTER_AUTH_URL}/invite/${token}`
  const inviterName = user.firstName ?? user.name.split(' ')[0] ?? user.name
  try {
    await sendInviteEmail(email, inviterName, group.name, safeUrl)
  } catch {
    return { ok: false, error: 'send_failed' }
  }
  return { ok: true }
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

  await writeOnboardingStatus(user.id, 'complete')
  const snapshot = await snapshotForMember(user.id, result.groupId, [], true, 'complete')
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

function emptySnapshot(
  identity: string | null,
  activeGroupId: string | null,
  groupMembers: GroupMember[],
  settled: string[],
  onboardingStatus: OnboardingStatus
): SyncSnapshot {
  return { identity, activeGroupId, groupMembers, events: [], theme: 'system', palette: 'default', locale: 'pt', onboardingStatus, settled }
}

async function snapshotForMember(
  userId: string,
  groupId: string,
  settled: string[],
  clearStaleActiveGroup: boolean,
  onboardingStatus: OnboardingStatus
): Promise<SyncSnapshot> {
  const membership = await readGroupMembership(groupId, userId)
  if (!membership) {
    if (clearStaleActiveGroup) await writeActiveGroupId(userId, null)
    return emptySnapshot(userId, null, [], settled, onboardingStatus)
  }

  const [allMembers, events, theme, palette, locale] = await Promise.all([
    readGroupMembersForMember(groupId, userId),
    readEventsForMember(groupId, userId),
    readTheme(userId),
    readPalette(userId),
    readLocale(userId)
  ])

  if (!allMembers.some((m) => m.userId === userId)) {
    if (clearStaleActiveGroup) await writeActiveGroupId(userId, null)
    return emptySnapshot(userId, null, [], settled, onboardingStatus)
  }

  const isOwner = membership.role === 'owner'
  const groupMembers = isOwner
    ? allMembers
    : allMembers.map((m) => (m.userId === userId ? m : { ...m, email: '' }))

  return {
    identity: userId,
    activeGroupId: groupId,
    groupMembers,
    events,
    theme,
    palette,
    locale,
    onboardingStatus,
    settled
  }
}

// --- Profile ---

const USERNAME_RE = /^[a-z0-9_.]{3,24}$/
const USERNAME_MIN = 3
const USERNAME_MAX = 24
const USERNAME_SUGGESTION_COUNT = 3
const USERNAME_SUGGESTION_TRIES = 60

function sanitizeUsername(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .replace(/^[_.]+/, '')
    .slice(0, USERNAME_MAX)
}

function padUsername(base: string): string {
  if (base.length >= USERNAME_MIN) return base
  const filler = 'sky'
  return (base + filler).slice(0, USERNAME_MAX).padEnd(USERNAME_MIN, '_')
}

function trim(value: string, room: number): string {
  return value.slice(0, Math.max(USERNAME_MIN, room))
}

function generateUsernameCandidates(email: string, firstName: string): string[] {
  const handle = sanitizeUsername((email.split('@')[0] ?? '').replace(/\+.*$/, ''))
  const first = sanitizeUsername(firstName)
  const seeds = [handle, first].filter((s) => s.length > 0).map(padUsername)
  const candidates: string[] = []
  for (const seed of seeds) candidates.push(seed)
  for (const seed of seeds) {
    for (let i = 0; i < 12; i++) {
      const n = 1 + Math.floor(Math.random() * 9999)
      const numStr = String(n)
      const trimmed = trim(seed, USERNAME_MAX - numStr.length)
      candidates.push(trimmed + numStr)
    }
    for (const sep of ['_', '.']) {
      candidates.push(trim(seed, USERNAME_MAX - 4) + sep + 'sky')
      candidates.push(trim(seed, USERNAME_MAX - 4) + sep + 'air')
    }
  }
  return Array.from(new Set(candidates)).filter((c) => USERNAME_RE.test(c))
}

export async function checkUsernameAvailable(value: string): Promise<'available' | 'invalid' | 'taken'> {
  const trimmed = (value ?? '').trim().toLowerCase()
  if (!trimmed) return 'invalid'
  if (!USERNAME_RE.test(trimmed)) return 'invalid'
  const ip = await getClientIp()
  if (!checkRateLimit(`username-check:${ip}`, 30, 60_000)) return 'invalid'
  return (await usernameExists(trimmed)) ? 'taken' : 'available'
}

export async function suggestUsernamesForSignup(email: string, firstName: string): Promise<{ suggestions: string[] }> {
  const candidates = generateUsernameCandidates(email, firstName)
  const out: string[] = []
  for (const candidate of candidates) {
    if (out.length >= USERNAME_SUGGESTION_COUNT) break
    if (out.includes(candidate)) continue
    if (!(await usernameExists(candidate))) out.push(candidate)
    if (out.length === 0 && candidates.indexOf(candidate) >= USERNAME_SUGGESTION_TRIES) break
  }
  return { suggestions: out }
}
const BLOB_HOST_RE = /^[a-z0-9-]+\.(public|private)\.blob\.vercel-storage\.com$/i
const MAX_IMAGE_BYTES = 200_000

function isOwnedProfileBlob(url: string | null, userId: string): url is string {
  if (typeof url !== 'string') return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  if (!BLOB_HOST_RE.test(parsed.host)) return false
  return parsed.pathname.startsWith(`/profile/${userId}/`)
}

function validateProfileImage(input: unknown, userId: string, previousImage: string | null): { ok: true; value: string | null } | { ok: false } {
  if (input === null || input === undefined || input === '') return { ok: true, value: null }
  if (typeof input !== 'string') return { ok: false }
  if (input === previousImage) return { ok: true, value: input }
  if (!isOwnedProfileBlob(input, userId)) return { ok: false }
  return { ok: true, value: input }
}

async function deleteBlobQuiet(url: string): Promise<void> {
  try {
    await del(url)
  } catch {
    // best-effort cleanup; orphaned blobs are not fatal
  }
}

export async function uploadProfileImage(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'unauthenticated' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'image_invalid' }
  if (file.type !== 'image/jpeg') return { ok: false, error: 'image_invalid' }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'image_too_large' }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[uploadProfileImage] BLOB_READ_WRITE_TOKEN is not set')
    return { ok: false, error: 'image_upload_failed' }
  }

  try {
    const blob = await put(`profile/${user.id}/avatar.jpg`, file, {
      access: 'private',
      contentType: 'image/jpeg',
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 30
    })
    return { ok: true, url: blob.url }
  } catch (e) {
    console.error('[uploadProfileImage] put failed:', e)
    return { ok: false, error: 'image_upload_failed' }
  }
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const user = await getSessionUser()
  if (!user) return null
  return readUserProfile(user.id)
}

export type ProfileUpdate = {
  firstName: string
  lastName: string | null
  username: string | null
  image: string | null
  country: string | null
  city: string | null
}

export async function updateMyProfile(input: ProfileUpdate): Promise<{ ok: true; profile: UserProfile } | { ok: false; error: string }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'unauthenticated' }

  const firstName = (input.firstName ?? '').trim()
  if (!firstName) return { ok: false, error: 'first_name_required' }
  if (firstName.length > 60) return { ok: false, error: 'first_name_too_long' }

  const lastNameRaw = (input.lastName ?? '').trim()
  const lastName = lastNameRaw.length === 0 ? null : lastNameRaw
  if (lastName && lastName.length > 60) return { ok: false, error: 'last_name_too_long' }

  const usernameRaw = (input.username ?? '').trim().toLowerCase()
  const username = usernameRaw.length === 0 ? null : usernameRaw
  if (username) {
    if (!USERNAME_RE.test(username)) return { ok: false, error: 'username_invalid' }
    if (await isUsernameTaken(username, user.id)) return { ok: false, error: 'username_taken' }
  }

  const countryRaw = (input.country ?? '').trim().toUpperCase()
  let country: string | null = null
  if (countryRaw.length > 0) {
    if (!isCountryCode(countryRaw)) return { ok: false, error: 'country_invalid' }
    country = countryRaw
  }

  const cityRaw = (input.city ?? '').trim()
  const city = cityRaw.length === 0 ? null : cityRaw.slice(0, 60)

  const previous = await readUserProfile(user.id)
  const imageCheck = validateProfileImage(input.image, user.id, previous?.image ?? null)
  if (!imageCheck.ok) return { ok: false, error: 'image_invalid' }
  const image = imageCheck.value

  const result = await updateUserProfile(user.id, { firstName, lastName, username, image, country, city })
  if (!result.ok) return { ok: false, error: result.reason }

  const previousImage = previous?.image ?? null
  if (previousImage && previousImage !== image && isOwnedProfileBlob(previousImage, user.id)) {
    await deleteBlobQuiet(previousImage)
  }

  const profile = await readUserProfile(user.id)
  if (!profile) return { ok: false, error: 'unknown' }
  return { ok: true, profile }
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

export async function userHasPassword(email: string): Promise<boolean> {
  return userHasCredentialAccount(email.trim().toLowerCase())
}

export async function checkUserHasPasskey(email: string): Promise<boolean> {
  return userHasPasskeysInStore(email.trim().toLowerCase())
}

export async function getEmailAuthState(email: string): Promise<{ exists: boolean; hasPassword: boolean; hasPasskey: boolean }> {
  const ip = await getClientIp()
  if (!checkRateLimit(`auth-state:${ip}`, 20, 60_000)) return { exists: false, hasPassword: false, hasPasskey: false }
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

  const ip = await getClientIp()
  if (!checkRateLimit(`pw-create:${ip}`, 5, 60_000)) return { ok: true }

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

export async function requestOtpEmail(email: string): Promise<{ ok: true } | { ok: false }> {
  if (!email || typeof email !== 'string') return { ok: false }

  const ip = await getClientIp()
  if (!checkRateLimit(`otp:${ip}`, 5, 60_000)) return { ok: false }

  const normalized = email.trim().toLowerCase()

  return withOtpErrorScope(async () => {
    await auth.api.sendVerificationOTP({
      body: { email: normalized, type: 'sign-in' }
    })

    if (consumeOtpSendError()) return { ok: false as const }
    return { ok: true as const }
  })
}
