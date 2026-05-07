import { hashPassword } from '@better-auth/utils/password'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { randomUUID } from 'node:crypto'
import * as schema from '../src/lib/db/schema'

const { users, accounts, preferences, groups, groupMembers, events } = schema

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

const db = drizzle(url, { schema })

type SeedUser = { key: string; firstName: string; lastName: string; email: string; password: string }

const SEED_USERS: SeedUser[] = [
  { key: 'henrique', firstName: 'Henrique', lastName: 'Krause', email: 'henrique@test.com', password: 'password123' },
  { key: 'pietra', firstName: 'Pietra', lastName: 'Silva', email: 'pietra@test.com', password: 'password123' },
  { key: 'alice', firstName: 'Alice', lastName: 'Souza', email: 'alice@test.com', password: 'password123' },
  { key: 'bob', firstName: 'Bob', lastName: 'Lima', email: 'bob@test.com', password: 'password123' },
  { key: 'carlos', firstName: 'Carlos', lastName: 'Pereira', email: 'carlos@test.com', password: 'password123' },
  { key: 'diana', firstName: 'Diana', lastName: 'Costa', email: 'diana@test.com', password: 'password123' },
  { key: 'eve', firstName: 'Eve', lastName: 'Almeida', email: 'eve@test.com', password: 'password123' },
  { key: 'frank', firstName: 'Frank', lastName: 'Nunes', email: 'frank@test.com', password: 'password123' }
]

type SeedGroup = {
  id: string
  name: string
  ownerKey: string
  memberKeys: string[]
  weekEvents: number
  olderEvents: number
}

// Designed so all-time and week orderings differ — toggling /world's window must visibly reorder the podium.
//   all-time: Praia(60) > Viagem(50) > Rio(40) > Família(25) > Trabalho(10)
//   week:     Viagem(30) > Praia(25) > Rio(12) > Trabalho(8) > Família(5)
// Henrique is a member of Viagem/Família/Trabalho → real names shown.
// Praia and Rio appear redacted as "Grupo #xxxxxx" in his /world.
// Empty Crew has zero events → excluded from ranking entirely.
const SEED_GROUPS: SeedGroup[] = [
  { id: 'seed-group-praia', name: 'Praia Galera', ownerKey: 'alice', memberKeys: ['alice', 'carlos', 'diana'], weekEvents: 25, olderEvents: 35 },
  { id: 'seed-group-viagem-sp', name: 'Viagem SP', ownerKey: 'henrique', memberKeys: ['henrique', 'pietra', 'alice'], weekEvents: 30, olderEvents: 20 },
  { id: 'seed-group-rio', name: 'Rio Trip', ownerKey: 'eve', memberKeys: ['eve', 'frank'], weekEvents: 12, olderEvents: 28 },
  { id: 'seed-group-familia', name: 'Família', ownerKey: 'pietra', memberKeys: ['pietra', 'henrique'], weekEvents: 5, olderEvents: 20 },
  { id: 'seed-group-trabalho', name: 'Trabalho', ownerKey: 'henrique', memberKeys: ['henrique', 'bob'], weekEvents: 8, olderEvents: 2 },
  { id: 'seed-group-empty', name: 'Empty Crew', ownerKey: 'frank', memberKeys: ['frank', 'eve'], weekEvents: 0, olderEvents: 0 }
]

const PRIMARY_USER_KEY = 'henrique'
const PRIMARY_ACTIVE_GROUP = 'seed-group-viagem-sp'

const DAY_MS = 24 * 60 * 60 * 1000

async function seed() {
  console.log('Seeding database...')

  const now = Date.now()
  const nowDate = new Date()
  const idByKey = new Map<string, string>()

  for (const u of SEED_USERS) {
    const hash = await hashPassword(u.password)

    await db
      .insert(users)
      .values({
        id: randomUUID(),
        name: `${u.firstName} ${u.lastName}`,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        emailVerified: true,
        onboardingStatus: 'complete',
        createdAt: nowDate,
        updatedAt: nowDate
      })
      .onConflictDoNothing()

    await db
      .update(users)
      .set({
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName} ${u.lastName}`,
        onboardingStatus: 'complete',
        updatedAt: nowDate
      })
      .where(eq(users.email, u.email))

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1)
    if (!user) continue

    await db
      .insert(accounts)
      .values({ id: randomUUID(), accountId: user.id, providerId: 'credential', userId: user.id, password: hash, createdAt: nowDate, updatedAt: nowDate })
      .onConflictDoNothing()

    await db.insert(preferences).values({ userId: user.id }).onConflictDoNothing()

    idByKey.set(u.key, user.id)
    console.log(`  user: ${u.email} (${user.id})`)
  }

  let totalEvents = 0
  for (const g of SEED_GROUPS) {
    const ownerId = idByKey.get(g.ownerKey)
    if (!ownerId) {
      console.warn(`  skip group ${g.name} — owner ${g.ownerKey} missing`)
      continue
    }

    await db
      .insert(groups)
      .values({ id: g.id, name: g.name, ownerId, createdAt: now })
      .onConflictDoUpdate({ target: groups.id, set: { name: g.name, ownerId } })

    const memberRows = g.memberKeys
      .map((k) => idByKey.get(k))
      .filter((id): id is string => Boolean(id))
      .map((userId) => ({
        groupId: g.id,
        userId,
        role: (userId === ownerId ? 'owner' : 'member') as 'owner' | 'member',
        joinedAt: now
      }))

    if (memberRows.length > 0) {
      await db.insert(groupMembers).values(memberRows).onConflictDoNothing()
    }

    const eventValues = buildEventsForGroup(g, idByKey, now)
    if (eventValues.length > 0) {
      await db.insert(events).values(eventValues).onConflictDoNothing()
      totalEvents += eventValues.length
    }

    console.log(`  group: "${g.name}" (${g.id}) — ${g.memberKeys.length} members, ${eventValues.length} events`)
  }

  const primaryId = idByKey.get(PRIMARY_USER_KEY)
  if (primaryId) {
    await db
      .insert(preferences)
      .values({ userId: primaryId, activeGroupId: PRIMARY_ACTIVE_GROUP })
      .onConflictDoUpdate({ target: preferences.userId, set: { activeGroupId: PRIMARY_ACTIVE_GROUP } })
    console.log(`  active group: ${PRIMARY_USER_KEY} → ${PRIMARY_ACTIVE_GROUP}`)
  }

  console.log(`Done. ${totalEvents} events across ${SEED_GROUPS.length} groups.`)
  console.log('Sign in as henrique@test.com / password123 and open /world to verify ranking.')
  process.exit(0)
}

function buildEventsForGroup(g: SeedGroup, idByKey: Map<string, string>, now: number) {
  const memberIds = g.memberKeys.map((k) => idByKey.get(k)).filter((id): id is string => Boolean(id))
  if (memberIds.length === 0) return []

  const weekStart = now - 6 * DAY_MS
  const olderStart = now - 30 * DAY_MS
  const olderEnd = now - 8 * DAY_MS

  const rows: { clientId: string; who: string; groupId: string; ts: number }[] = []

  for (let i = 0; i < g.weekEvents; i++) {
    rows.push({
      clientId: `seed:${g.id}:w:${i}`,
      who: memberIds[i % memberIds.length],
      groupId: g.id,
      ts: weekStart + Math.floor(((i + 1) / (g.weekEvents + 1)) * (now - weekStart))
    })
  }
  for (let i = 0; i < g.olderEvents; i++) {
    rows.push({
      clientId: `seed:${g.id}:o:${i}`,
      who: memberIds[i % memberIds.length],
      groupId: g.id,
      ts: olderStart + Math.floor(((i + 1) / (g.olderEvents + 1)) * (olderEnd - olderStart))
    })
  }
  return rows
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
