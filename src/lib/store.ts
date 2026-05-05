import 'server-only'

import { and, eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db, events, groupMembers, groups, preferences, processedOps, users } from './db'
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
