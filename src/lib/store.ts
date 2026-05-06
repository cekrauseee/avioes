import 'server-only'

import crypto from 'crypto'
import { and, eq, gt, like, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { accounts, db, events, groupInvitations, groupMembers, groups, preferences, processedOps, users, verifications } from './db'
import type { AirplaneEvent, Group, GroupMember, GroupRole, Locale, Palette, PendingOp, Theme } from './types'

const groupMembersForCount = alias(groupMembers, 'group_members_for_count')

export async function readGroupsForUser(userId: string): Promise<(Group & { memberCount: number })[]> {
  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      ownerId: groups.ownerId,
      memberCount: sql<number>`count(${groupMembersForCount.userId})::int`
    })
    .from(groups)
    .innerJoin(groupMembers, and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, userId)))
    .leftJoin(groupMembersForCount, eq(groupMembersForCount.groupId, groups.id))
    .groupBy(groups.id, groups.name, groups.ownerId)
  return rows
}

export async function readGroupMembership(groupId: string, userId: string): Promise<{ userId: string; role: GroupRole } | null> {
  const row = await db
    .select({ userId: groupMembers.userId, role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1)
  return row[0] ?? null
}

export async function readGroupForMember(groupId: string, userId: string): Promise<Group | null> {
  const requester = alias(groupMembers, 'requester_group_member')
  const row = await db
    .select({ id: groups.id, name: groups.name, ownerId: groups.ownerId })
    .from(groups)
    .innerJoin(requester, and(eq(requester.groupId, groups.id), eq(requester.userId, userId)))
    .where(eq(groups.id, groupId))
    .limit(1)
  return row[0] ?? null
}

export async function readGroupMembersForMember(groupId: string, userId: string): Promise<GroupMember[]> {
  const requester = alias(groupMembers, 'requester_group_member_for_list')
  const rows = await db
    .select({
      userId: groupMembers.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      name: users.name,
      email: users.email,
      image: users.image,
      role: groupMembers.role
    })
    .from(groupMembers)
    .innerJoin(requester, and(eq(requester.groupId, groupMembers.groupId), eq(requester.userId, userId)))
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(groupMembers.joinedAt)
  return rows.map(({ name, firstName, ...rest }) => ({
    ...rest,
    firstName: firstName ?? name.split(' ')[0] ?? name,
    lastName: rest.lastName ?? deriveLastName(name, firstName)
  }))
}

function deriveLastName(name: string, firstName: string | null): string | null {
  if (firstName && name.startsWith(firstName + ' ')) return name.slice(firstName.length + 1)
  const parts = name.split(' ')
  if (parts.length < 2) return null
  return parts.slice(1).join(' ')
}

export async function createGroup(id: string, name: string, ownerId: string): Promise<void> {
  const now = Date.now()
  await db.transaction(async (tx) => {
    await tx.insert(groups).values({ id, name, ownerId, createdAt: now })
    await tx.insert(groupMembers).values({ groupId: id, userId: ownerId, role: 'owner', joinedAt: now })
  })
}

export async function updateGroup(groupId: string, updates: { name?: string }): Promise<void> {
  if (Object.keys(updates).length === 0) return
  await db.update(groups).set(updates).where(eq(groups.id, groupId))
}

export async function deleteGroup(groupId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(preferences).set({ activeGroupId: null }).where(eq(preferences.activeGroupId, groupId))
    await tx.delete(groups).where(eq(groups.id, groupId))
  })
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    await tx
      .update(preferences)
      .set({ activeGroupId: null })
      .where(and(eq(preferences.userId, userId), eq(preferences.activeGroupId, groupId)))
  })
}

export async function addGroupMember(groupId: string, userId: string): Promise<void> {
  await db.insert(groupMembers).values({ groupId, userId, role: 'member', joinedAt: Date.now() }).onConflictDoNothing()
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    await tx
      .update(preferences)
      .set({ activeGroupId: null })
      .where(and(eq(preferences.userId, userId), eq(preferences.activeGroupId, groupId)))
  })
}

// --- Invitations ---

export async function createInvitation(params: {
  id: string
  token: string
  groupId: string
  invitedEmail: string
  invitedByUserId: string
  expiresAt: number
}): Promise<void> {
  await db.insert(groupInvitations).values({
    ...params,
    status: 'pending',
    createdAt: Date.now()
  })
}

export type InvitationDetails = {
  id: string
  token: string
  groupId: string
  groupName: string
  invitedEmail: string
  invitedByFirstName: string
  invitedByImage: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  createdAt: number
  expiresAt: number
}

export async function readInvitationByToken(token: string): Promise<InvitationDetails | null> {
  const row = await db
    .select({
      id: groupInvitations.id,
      token: groupInvitations.token,
      groupId: groupInvitations.groupId,
      groupName: groups.name,
      invitedEmail: groupInvitations.invitedEmail,
      invitedByFirstName: users.firstName,
      invitedByName: users.name,
      invitedByImage: users.image,
      status: groupInvitations.status,
      createdAt: groupInvitations.createdAt,
      expiresAt: groupInvitations.expiresAt
    })
    .from(groupInvitations)
    .innerJoin(groups, eq(groups.id, groupInvitations.groupId))
    .innerJoin(users, eq(users.id, groupInvitations.invitedByUserId))
    .where(eq(groupInvitations.token, token))
    .limit(1)
  const found = row[0]
  if (!found) return null
  return {
    id: found.id,
    token: found.token,
    groupId: found.groupId,
    groupName: found.groupName,
    invitedEmail: found.invitedEmail,
    invitedByFirstName: found.invitedByFirstName ?? found.invitedByName.split(' ')[0] ?? found.invitedByName,
    invitedByImage: found.invitedByImage,
    status: found.status,
    createdAt: found.createdAt,
    expiresAt: found.expiresAt
  }
}

export type PendingInvitation = {
  id: string
  invitedEmail: string
  createdAt: number
  expiresAt: number
}

export async function readPendingInvitationsForGroup(groupId: string): Promise<PendingInvitation[]> {
  return db
    .select({
      id: groupInvitations.id,
      invitedEmail: groupInvitations.invitedEmail,
      createdAt: groupInvitations.createdAt,
      expiresAt: groupInvitations.expiresAt
    })
    .from(groupInvitations)
    .where(and(eq(groupInvitations.groupId, groupId), eq(groupInvitations.status, 'pending'), sql`${groupInvitations.expiresAt} > ${Date.now()}`))
    .orderBy(groupInvitations.createdAt)
}

export async function acceptInvitation(
  token: string,
  userId: string
): Promise<
  { ok: true; groupId: string; groupName: string } | { ok: false; error: 'not_found' | 'expired' | 'already_used' | 'cancelled' | 'already_member' }
> {
  return db.transaction(async (tx) => {
    const row = await tx
      .select({
        id: groupInvitations.id,
        groupId: groupInvitations.groupId,
        groupName: groups.name,
        status: groupInvitations.status,
        expiresAt: groupInvitations.expiresAt
      })
      .from(groupInvitations)
      .innerJoin(groups, eq(groups.id, groupInvitations.groupId))
      .where(eq(groupInvitations.token, token))
      .limit(1)

    const inv = row[0]
    if (!inv) return { ok: false as const, error: 'not_found' as const }
    if (inv.status === 'cancelled') return { ok: false as const, error: 'cancelled' as const }
    if (inv.status !== 'pending') return { ok: false as const, error: 'already_used' as const }
    if (inv.expiresAt <= Date.now()) return { ok: false as const, error: 'expired' as const }

    const existing = await tx
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, inv.groupId), eq(groupMembers.userId, userId)))
      .limit(1)
    if (existing.length > 0) return { ok: false as const, error: 'already_member' as const }

    const claimed = await tx
      .update(groupInvitations)
      .set({ status: 'accepted' })
      .where(and(eq(groupInvitations.id, inv.id), eq(groupInvitations.status, 'pending')))
      .returning({ id: groupInvitations.id })
    if (claimed.length === 0) return { ok: false as const, error: 'already_used' as const }

    await tx.insert(groupMembers).values({ groupId: inv.groupId, userId, role: 'member', joinedAt: Date.now() }).onConflictDoNothing()
    await tx
      .insert(preferences)
      .values({ userId, activeGroupId: inv.groupId })
      .onConflictDoUpdate({ target: preferences.userId, set: { activeGroupId: inv.groupId } })

    return { ok: true as const, groupId: inv.groupId, groupName: inv.groupName }
  })
}

export async function rejectInvitation(
  token: string
): Promise<{ ok: true } | { ok: false; error: 'not_found' | 'expired' | 'already_used' | 'cancelled' }> {
  return db.transaction(async (tx) => {
    const row = await tx
      .select({ id: groupInvitations.id, status: groupInvitations.status, expiresAt: groupInvitations.expiresAt })
      .from(groupInvitations)
      .where(eq(groupInvitations.token, token))
      .limit(1)

    const inv = row[0]
    if (!inv) return { ok: false as const, error: 'not_found' as const }
    if (inv.status === 'cancelled') return { ok: false as const, error: 'cancelled' as const }
    if (inv.status !== 'pending') return { ok: false as const, error: 'already_used' as const }
    if (inv.expiresAt <= Date.now()) return { ok: false as const, error: 'expired' as const }

    const claimed = await tx
      .update(groupInvitations)
      .set({ status: 'rejected' })
      .where(and(eq(groupInvitations.id, inv.id), eq(groupInvitations.status, 'pending')))
      .returning({ id: groupInvitations.id })
    if (claimed.length === 0) return { ok: false as const, error: 'already_used' as const }
    return { ok: true as const }
  })
}

export async function cancelInvitation(groupId: string, invitationId: string): Promise<void> {
  await db
    .update(groupInvitations)
    .set({ status: 'cancelled' })
    .where(and(eq(groupInvitations.id, invitationId), eq(groupInvitations.groupId, groupId), eq(groupInvitations.status, 'pending')))
}

export async function readExistingPendingInvitation(groupId: string, email: string): Promise<{ id: string; token: string } | null> {
  const row = await db
    .select({ id: groupInvitations.id, token: groupInvitations.token })
    .from(groupInvitations)
    .where(
      and(
        eq(groupInvitations.groupId, groupId),
        eq(groupInvitations.invitedEmail, email),
        eq(groupInvitations.status, 'pending'),
        sql`${groupInvitations.expiresAt} > ${Date.now()}`
      )
    )
    .limit(1)
  return row[0] ?? null
}

export async function findUserByEmail(email: string): Promise<{ id: string; firstName: string; lastName: string | null; email: string } | null> {
  const row = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  const found = row[0]
  if (!found) return null
  return {
    id: found.id,
    firstName: found.firstName ?? found.name.split(' ')[0] ?? found.name,
    lastName: found.lastName ?? deriveLastName(found.name, found.firstName),
    email: found.email
  }
}

export async function readEventsForMember(groupId: string, userId: string): Promise<AirplaneEvent[]> {
  const requester = alias(groupMembers, 'requester_group_member_for_events')
  const rows = await db
    .select({ id: events.id, clientId: events.clientId, who: events.who, ts: events.ts })
    .from(events)
    .innerJoin(requester, and(eq(requester.groupId, events.groupId), eq(requester.userId, userId)))
    .where(eq(events.groupId, groupId))
    .orderBy(events.ts, events.id)
  return rows.map((row) => ({
    id: row.clientId ?? `server:${row.id}`,
    who: row.who,
    ts: row.ts
  }))
}

export async function readTheme(userId: string | null): Promise<Theme> {
  if (!userId) return 'system'
  const row = await db.select({ theme: preferences.theme }).from(preferences).where(eq(preferences.userId, userId)).limit(1)
  return row[0]?.theme ?? 'system'
}

export async function readPalette(userId: string | null): Promise<Palette> {
  if (!userId) return 'default'
  const row = await db.select({ palette: preferences.palette }).from(preferences).where(eq(preferences.userId, userId)).limit(1)
  return row[0]?.palette ?? 'default'
}

export async function readLocale(userId: string | null): Promise<Locale> {
  if (!userId) return 'pt'
  const row = await db.select({ locale: preferences.locale }).from(preferences).where(eq(preferences.userId, userId)).limit(1)
  return row[0]?.locale ?? 'pt'
}

export async function readActiveGroupId(userId: string): Promise<string | null> {
  const row = await db.select({ activeGroupId: preferences.activeGroupId }).from(preferences).where(eq(preferences.userId, userId)).limit(1)
  return row[0]?.activeGroupId ?? null
}

export async function writeActiveGroupId(userId: string, groupId: string | null): Promise<void> {
  await db
    .insert(preferences)
    .values({ userId, activeGroupId: groupId })
    .onConflictDoUpdate({ target: preferences.userId, set: { activeGroupId: groupId } })
}

export async function applyOps(ops: PendingOp[], userId: string, groupId: string): Promise<string[]> {
  const settled: string[] = []
  for (const op of ops) {
    try {
      await db.transaction(async (tx) => {
        const inserted = await tx.insert(processedOps).values({ id: op.id }).onConflictDoNothing().returning({ id: processedOps.id })
        if (inserted.length === 0) return
        const membership = await tx
          .select({ userId: groupMembers.userId })
          .from(groupMembers)
          .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
          .limit(1)
        if (membership.length === 0) return
        if (op.kind === 'add-event') {
          if (op.event.who !== userId) return
          await tx.insert(events).values({ clientId: op.event.id, who: userId, groupId, ts: op.event.ts }).onConflictDoNothing()
        } else if (op.kind === 'delete-event') {
          const serverId = parseServerEventId(op.eventId)
          if (serverId !== null) {
            await tx.delete(events).where(and(eq(events.id, serverId), eq(events.who, userId), eq(events.groupId, groupId)))
          } else {
            await tx.delete(events).where(and(eq(events.clientId, op.eventId), eq(events.who, userId), eq(events.groupId, groupId)))
          }
        } else if (op.kind === 'set-theme') {
          await tx
            .insert(preferences)
            .values({ userId, theme: op.theme })
            .onConflictDoUpdate({ target: preferences.userId, set: { theme: op.theme } })
        } else if (op.kind === 'set-palette') {
          await tx
            .insert(preferences)
            .values({ userId, palette: op.palette })
            .onConflictDoUpdate({ target: preferences.userId, set: { palette: op.palette } })
        } else if (op.kind === 'set-locale') {
          await tx
            .insert(preferences)
            .values({ userId, locale: op.locale })
            .onConflictDoUpdate({ target: preferences.userId, set: { locale: op.locale } })
        }
      })
      settled.push(op.id)
    } catch {
      break
    }
  }
  return settled
}

function parseServerEventId(id: string): number | null {
  if (!id.startsWith('server:')) return null
  const n = Number(id.slice('server:'.length))
  return Number.isInteger(n) && n > 0 ? n : null
}

// --- Password tokens ---

const PW_TOKEN_EXPIRY_MS = 15 * 60 * 1000
const PW_MAX_ATTEMPTS = 5

type PasswordTokenType = 'change' | 'create'

function pwIdentifier(email: string, type: PasswordTokenType): string {
  return `pw-${type}:${email.toLowerCase()}`
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function createPasswordToken(email: string, type: PasswordTokenType): Promise<string> {
  const identifier = pwIdentifier(email, type)
  const token = crypto.randomUUID()
  const tokenHash = hashToken(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + PW_TOKEN_EXPIRY_MS)

  await db.delete(verifications).where(eq(verifications.identifier, identifier))

  await db.insert(verifications).values({
    id: crypto.randomUUID(),
    identifier,
    value: tokenHash,
    expiresAt,
    createdAt: now,
    updatedAt: now
  })

  await recordPasswordSend(email, type)

  return token
}

export async function validatePasswordToken(token: string, type: PasswordTokenType): Promise<{ email: string } | null> {
  const prefix = `pw-${type}:`
  const tokenHash = hashToken(token)
  const row = await db
    .select({ identifier: verifications.identifier, expiresAt: verifications.expiresAt })
    .from(verifications)
    .where(and(eq(verifications.value, tokenHash), like(verifications.identifier, `${prefix}%`)))
    .limit(1)

  const found = row[0]
  if (!found) return null
  if (found.expiresAt <= new Date()) return null

  const email = found.identifier.slice(prefix.length)
  return { email }
}

export async function consumePasswordToken(token: string, type: PasswordTokenType): Promise<boolean> {
  const prefix = `pw-${type}:`
  const tokenHash = hashToken(token)
  const deleted = await db
    .delete(verifications)
    .where(and(eq(verifications.value, tokenHash), like(verifications.identifier, `${prefix}%`)))
    .returning({ id: verifications.id })
  return deleted.length > 0
}

export async function recordPasswordAttempt(token: string, type: PasswordTokenType): Promise<{ blocked: boolean }> {
  const tokenHash = hashToken(token)
  const failId = `pw-fail:${type}:${tokenHash}`
  const now = new Date()
  const expiresAt = new Date(now.getTime() + PW_TOKEN_EXPIRY_MS)

  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${failId}, '1', ${expiresAt}, ${now}, ${now})
    ON CONFLICT (identifier) WHERE identifier LIKE 'pw-fail:%'
    DO UPDATE SET value = (verification.value::int + 1)::text, updated_at = ${now}
    RETURNING value::int AS count
  `)

  const count = result.rows[0]?.count ?? 1
  if (count >= PW_MAX_ATTEMPTS) {
    await consumePasswordToken(token, type)
    await db.delete(verifications).where(eq(verifications.identifier, failId))
    return { blocked: true }
  }

  return { blocked: false }
}

export async function userHasCredentialAccount(email: string): Promise<boolean> {
  const row = await db
    .select({ id: accounts.id })
    .from(accounts)
    .innerJoin(users, eq(users.id, accounts.userId))
    .where(and(eq(users.email, email.toLowerCase()), eq(accounts.providerId, 'credential')))
    .limit(1)
  return row.length > 0
}

export async function getCredentialPasswordHash(email: string): Promise<string | null> {
  const row = await db
    .select({ password: accounts.password })
    .from(accounts)
    .innerJoin(users, eq(users.id, accounts.userId))
    .where(and(eq(users.email, email.toLowerCase()), eq(accounts.providerId, 'credential')))
    .limit(1)
  return row[0]?.password ?? null
}

function pwSendIdentifier(email: string, type: PasswordTokenType): string {
  return `pw-send-${type}:${email.toLowerCase()}`
}

async function recordPasswordSend(email: string, type: PasswordTokenType): Promise<void> {
  const identifier = pwSendIdentifier(email, type)
  const now = new Date()
  await db.insert(verifications).values({
    id: crypto.randomUUID(),
    identifier,
    value: crypto.randomUUID(),
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now
  })
}

export async function countRecentPasswordSends(email: string, type: PasswordTokenType): Promise<number> {
  const identifier = pwSendIdentifier(email, type)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const row = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(verifications)
    .where(and(eq(verifications.identifier, identifier), gt(verifications.createdAt, oneHourAgo)))
  return row[0]?.count ?? 0
}

export async function createCredentialAccount(userId: string, passwordHash: string): Promise<boolean> {
  const now = new Date()
  const result = await db
    .insert(accounts)
    .values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoNothing({ target: [accounts.userId, accounts.providerId] })
    .returning({ id: accounts.id })
  return result.length > 0
}
