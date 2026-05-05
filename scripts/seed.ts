import { hashPassword } from '@better-auth/utils/password'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { randomUUID } from 'node:crypto'
import * as schema from '../src/lib/db/schema'

const { users, accounts, preferences, groups, groupMembers, events } = schema

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

const db = drizzle(url, { schema })

const SEED_USERS = [
  { name: 'Henrique', email: 'henrique@test.com', password: 'password123' },
  { name: 'Pietra', email: 'pietra@test.com', password: 'password123' },
  { name: 'Alice', email: 'alice@test.com', password: 'password123' },
  { name: 'Bob', email: 'bob@test.com', password: 'password123' }
]

async function seed() {
  console.log('Seeding database...')

  const now = Date.now()
  const nowDate = new Date()
  const resolvedUsers: { id: string; name: string; email: string }[] = []

  for (const u of SEED_USERS) {
    const hash = await hashPassword(u.password)

    await db
      .insert(users)
      .values({ id: randomUUID(), name: u.name, email: u.email, emailVerified: true, createdAt: nowDate, updatedAt: nowDate })
      .onConflictDoNothing()

    const [user] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.email, u.email)).limit(1)
    if (!user) continue

    await db
      .insert(accounts)
      .values({ id: randomUUID(), accountId: user.id, providerId: 'credential', userId: user.id, password: hash, createdAt: nowDate, updatedAt: nowDate })
      .onConflictDoNothing()

    await db.insert(preferences).values({ userId: user.id }).onConflictDoNothing()

    resolvedUsers.push(user)
    console.log(`  user: ${user.email} (${user.id})`)
  }

  if (resolvedUsers.length < 2) {
    console.log('Not enough users created — skipping groups/events')
    process.exit(0)
  }

  const [owner, member] = resolvedUsers
  const groupId = 'seed-group-viagem-sp'

  await db
    .insert(groups)
    .values({ id: groupId, name: 'Viagem SP', ownerId: owner.id, createdAt: now })
    .onConflictDoUpdate({ target: groups.id, set: { name: 'Viagem SP' } })

  await db
    .insert(groupMembers)
    .values([
      { groupId, userId: owner.id, role: 'owner', joinedAt: now },
      { groupId, userId: member.id, role: 'member', joinedAt: now }
    ])
    .onConflictDoNothing()

  for (const u of [owner, member]) {
    await db
      .insert(preferences)
      .values({ userId: u.id, activeGroupId: groupId })
      .onConflictDoUpdate({ target: preferences.userId, set: { activeGroupId: groupId } })
  }

  console.log(`  group: "Viagem SP" (${groupId})`)

  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const eventValues = Array.from({ length: 20 }, (_, i) => ({
    clientId: `seed-${i}`,
    who: i % 3 === 0 ? member.id : owner.id,
    groupId,
    ts: weekAgo + i * 8 * 60 * 60 * 1000
  }))

  await db.insert(events).values(eventValues).onConflictDoNothing()
  console.log(`  events: ${eventValues.length}`)

  console.log('Done.')
  process.exit(0)
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
