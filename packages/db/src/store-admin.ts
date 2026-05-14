import 'server-only'

import type { KNOWN_FEATURE_FLAGS } from '@airplanes/types/feature-flags'
import { and, count, desc, eq, ilike, isNotNull, isNull, or, sql } from 'drizzle-orm'
import { db, events, groupMembers, groups, preferences, sessions, users } from '.'

type FeatureFlag = (typeof KNOWN_FEATURE_FLAGS)[number]

// --- Stats ---

export async function adminGetStats() {
  const [userStats] = await db
    .select({
      total: count(),
      active: count(sql`CASE WHEN ${users.deletedAt} IS NULL THEN 1 END`),
      deleted: count(sql`CASE WHEN ${users.deletedAt} IS NOT NULL THEN 1 END`)
    })
    .from(users)
  const [groupStats] = await db
    .select({
      total: count(),
      active: count(sql`CASE WHEN ${groups.deletedAt} IS NULL THEN 1 END`),
      deleted: count(sql`CASE WHEN ${groups.deletedAt} IS NOT NULL THEN 1 END`)
    })
    .from(groups)
  const [eventStats] = await db
    .select({
      total: count(),
      active: count(sql`CASE WHEN ${events.deletedAt} IS NULL THEN 1 END`),
      deleted: count(sql`CASE WHEN ${events.deletedAt} IS NOT NULL THEN 1 END`)
    })
    .from(events)
  return { users: userStats, groups: groupStats, events: eventStats }
}

// --- Users ---

type UserStatus = 'active' | 'deleted' | 'all'

export type AdminUserRow = {
  id: string
  name: string
  firstName: string | null
  lastName: string | null
  username: string | null
  email: string
  emailVerified: boolean
  image: string | null
  country: string | null
  city: string | null
  onboardingStatus: string | null
  featureFlags: string[]
  deletedAt: Date | null
  createdAt: Date
}

export async function adminListUsers(opts: { search?: string; status?: UserStatus; cursor?: string; limit?: number }) {
  const limit = Math.min(opts.limit ?? 50, 100)
  const conditions = []

  if (opts.status === 'active') conditions.push(isNull(users.deletedAt))
  else if (opts.status === 'deleted') conditions.push(isNotNull(users.deletedAt))

  if (opts.search) {
    const pattern = `%${opts.search}%`
    conditions.push(or(ilike(users.email, pattern), ilike(users.username, pattern), ilike(users.name, pattern)))
  }

  if (opts.cursor) {
    conditions.push(sql`${users.createdAt} < ${new Date(opts.cursor)}`)
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      email: users.email,
      emailVerified: users.emailVerified,
      image: users.image,
      country: users.country,
      city: users.city,
      onboardingStatus: users.onboardingStatus,
      featureFlags: users.featureFlags,
      deletedAt: users.deletedAt,
      createdAt: users.createdAt
    })
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null
  return { items: items as AdminUserRow[], nextCursor }
}

export async function adminGetUser(id: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      email: users.email,
      emailVerified: users.emailVerified,
      image: users.image,
      country: users.country,
      city: users.city,
      onboardingStatus: users.onboardingStatus,
      featureFlags: users.featureFlags,
      deletedAt: users.deletedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  if (!user) return null

  const userGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      ownerId: groups.ownerId,
      deletedAt: groups.deletedAt
    })
    .from(groups)
    .innerJoin(groupMembers, and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, id), isNull(groupMembers.deletedAt)))
    .where(isNull(groups.deletedAt))

  const [activeGroupRow] = await db.select({ activeGroupId: preferences.activeGroupId }).from(preferences).where(eq(preferences.userId, id)).limit(1)

  return { ...user, groups: userGroups, activeGroupId: activeGroupRow?.activeGroupId ?? null }
}

export async function adminUpdateUser(
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
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.firstName !== undefined) {
    set.firstName = patch.firstName
    set.name = patch.lastName ? `${patch.firstName} ${patch.lastName}` : patch.firstName
  }
  if (patch.lastName !== undefined) {
    set.lastName = patch.lastName
    if (patch.firstName === undefined) {
      const [row] = await db.select({ firstName: users.firstName }).from(users).where(eq(users.id, id)).limit(1)
      set.name = patch.lastName ? `${row?.firstName ?? ''} ${patch.lastName}` : (row?.firstName ?? '')
    }
  }
  if (patch.username !== undefined) set.username = patch.username || null
  if (patch.email !== undefined) set.email = patch.email
  if (patch.emailVerified !== undefined) set.emailVerified = patch.emailVerified
  if (patch.onboardingStatus !== undefined) set.onboardingStatus = patch.onboardingStatus

  await db.update(users).set(set).where(eq(users.id, id))
}

export async function adminSetFeatureFlags(id: string, flags: string[]) {
  const { KNOWN_FEATURE_FLAGS } = await import('@airplanes/types/feature-flags')
  const valid = flags.filter((f) => (KNOWN_FEATURE_FLAGS as readonly string[]).includes(f))
  await db.update(users).set({ featureFlags: valid, updatedAt: new Date() }).where(eq(users.id, id))
}

export async function adminSoftDeleteUser(userId: string): Promise<{ ok: true } | { ok: false; error: string; groupIds?: string[] }> {
  const ownedGroups = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.ownerId, userId), isNull(groups.deletedAt)))

  if (ownedGroups.length > 0) {
    return { ok: false, error: 'user_owns_groups', groupIds: ownedGroups.map((g) => g.id) }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    await tx.delete(sessions).where(eq(sessions.userId, userId))
  })
  return { ok: true }
}

export async function adminRestoreUser(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [target] = await db.select({ email: users.email, username: users.username }).from(users).where(eq(users.id, userId)).limit(1)
  if (!target) return { ok: false, error: 'not_found' }

  const conflicts = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        or(eq(users.email, target.email), target.username ? eq(users.username, target.username) : undefined)
      )
    )
    .limit(1)

  if (conflicts.length > 0) return { ok: false, error: 'email_or_username_taken' }

  await db
    .update(users)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(users.id, userId), isNotNull(users.deletedAt)))
  return { ok: true }
}

// --- Groups ---

export type AdminGroupRow = {
  id: string
  name: string
  ownerId: string
  ownerName: string
  memberCount: number
  eventCount: number
  deletedAt: Date | null
  createdAt: number
}

export async function adminListGroups(opts: { search?: string; status?: UserStatus; cursor?: string; limit?: number }) {
  const limit = Math.min(opts.limit ?? 50, 100)
  const conditions = []

  if (opts.status === 'active') conditions.push(isNull(groups.deletedAt))
  else if (opts.status === 'deleted') conditions.push(isNotNull(groups.deletedAt))

  if (opts.search) {
    const pattern = `%${opts.search}%`
    conditions.push(ilike(groups.name, pattern))
  }

  if (opts.cursor) {
    conditions.push(sql`${groups.createdAt} < ${Number(opts.cursor)}`)
  }

  const owner = db.select({ id: users.id, name: users.name }).from(users).as('owner')

  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      ownerId: groups.ownerId,
      ownerName: owner.name,
      memberCount: sql<number>`(SELECT count(*)::int FROM group_members WHERE group_id = ${groups.id} AND deleted_at IS NULL)`,
      eventCount: sql<number>`(SELECT count(*)::int FROM events WHERE group_id = ${groups.id} AND deleted_at IS NULL)`,
      deletedAt: groups.deletedAt,
      createdAt: groups.createdAt
    })
    .from(groups)
    .innerJoin(owner, eq(owner.id, groups.ownerId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(groups.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? String(items[items.length - 1].createdAt) : null
  return { items: items as AdminGroupRow[], nextCursor }
}

export async function adminGetGroup(id: string) {
  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
      ownerId: groups.ownerId,
      deletedAt: groups.deletedAt,
      createdAt: groups.createdAt
    })
    .from(groups)
    .where(eq(groups.id, id))
    .limit(1)
  if (!group) return null

  const members = await db
    .select({
      userId: groupMembers.userId,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
      deletedAt: groupMembers.deletedAt,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(and(eq(groupMembers.groupId, id), isNull(groupMembers.deletedAt)))
    .orderBy(groupMembers.joinedAt)

  const eventCount = await db
    .select({ count: count() })
    .from(events)
    .where(and(eq(events.groupId, id), isNull(events.deletedAt)))

  return { ...group, members, eventCount: eventCount[0]?.count ?? 0 }
}

export async function adminUpdateGroup(id: string, patch: { name?: string; ownerId?: string }) {
  if (patch.name) {
    await db.update(groups).set({ name: patch.name }).where(eq(groups.id, id))
  }
  if (patch.ownerId) {
    await db.transaction(async (tx) => {
      const [current] = await tx.select({ ownerId: groups.ownerId }).from(groups).where(eq(groups.id, id)).limit(1)
      if (!current) return
      const [targetMember] = await tx
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .innerJoin(users, and(eq(users.id, groupMembers.userId), isNull(users.deletedAt)))
        .where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, patch.ownerId!), isNull(groupMembers.deletedAt)))
        .limit(1)
      if (!targetMember) return
      await tx.update(groups).set({ ownerId: patch.ownerId! }).where(eq(groups.id, id))
      await tx
        .update(groupMembers)
        .set({ role: 'member' })
        .where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, current.ownerId)))
      await tx
        .update(groupMembers)
        .set({ role: 'owner' })
        .where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, patch.ownerId!)))
    })
  }
}

export async function adminSoftDeleteGroup(groupId: string) {
  await db.transaction(async (tx) => {
    const now = new Date()
    await tx.update(preferences).set({ activeGroupId: null }).where(eq(preferences.activeGroupId, groupId))
    await tx
      .update(groups)
      .set({ deletedAt: now })
      .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    await tx
      .update(groupMembers)
      .set({ deletedAt: now })
      .where(and(eq(groupMembers.groupId, groupId), isNull(groupMembers.deletedAt)))
    await tx
      .update(events)
      .set({ deletedAt: now })
      .where(and(eq(events.groupId, groupId), isNull(events.deletedAt)))
  })
}

export async function adminRestoreGroup(groupId: string) {
  await db.transaction(async (tx) => {
    const [row] = await tx.select({ deletedAt: groups.deletedAt }).from(groups).where(eq(groups.id, groupId)).limit(1)
    const groupDeletedAt = row?.deletedAt
    if (!groupDeletedAt) return

    await tx.update(groups).set({ deletedAt: null }).where(eq(groups.id, groupId))
    await tx
      .update(groupMembers)
      .set({ deletedAt: null })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.deletedAt, groupDeletedAt)))
    await tx
      .update(events)
      .set({ deletedAt: null })
      .where(and(eq(events.groupId, groupId), eq(events.deletedAt, groupDeletedAt)))
  })
}

// --- Members ---

export async function adminRemoveGroupMember(groupId: string, userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [group] = await db.select({ ownerId: groups.ownerId }).from(groups).where(eq(groups.id, groupId)).limit(1)
  if (group?.ownerId === userId) return { ok: false, error: 'cannot_remove_owner' }

  await db.transaction(async (tx) => {
    await tx
      .update(groupMembers)
      .set({ deletedAt: new Date() })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId), isNull(groupMembers.deletedAt)))
    await tx
      .update(preferences)
      .set({ activeGroupId: null })
      .where(and(eq(preferences.userId, userId), eq(preferences.activeGroupId, groupId)))
  })
  return { ok: true }
}

// --- Events ---

export async function adminSoftDeleteEvent(eventId: number) {
  await db
    .update(events)
    .set({ deletedAt: new Date() })
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
}

export async function adminRestoreEvent(eventId: number) {
  await db
    .update(events)
    .set({ deletedAt: null })
    .where(and(eq(events.id, eventId), isNotNull(events.deletedAt)))
}
