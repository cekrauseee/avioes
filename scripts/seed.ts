import { hashPassword } from '@better-auth/utils/password'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { randomUUID } from 'node:crypto'
import * as schema from '../src/lib/db/schema'

const { users, accounts, preferences, groups, groupMembers, events } = schema

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

const db = drizzle(url, { schema })

const DAY_MS = 24 * 60 * 60 * 1000

// Deterministic LCG so event timestamps are reproducible
let _rng = 1_234_567
function rand(): number {
  _rng = ((_rng * 1_664_525 + 1_013_904_223) | 0) >>> 0
  return _rng / 0xffffffff
}
function ri(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min
}

// ─── Users ──────────────────────────────────────────────────────────────────

type SeedUser = {
  key: string
  firstName: string
  lastName: string
  email: string
  locale: 'pt' | 'en'
  palette?: 'default' | 'ocean' | 'lavender' | 'earth' | 'blossom' | 'sky'
  theme?: 'light' | 'dark' | 'system'
}

const SEED_USERS: SeedUser[] = [
  // ── Brasileiros ─────────────────────────────────────────────────────────
  { key: 'henrique',  firstName: 'Henrique',  lastName: 'Krause',    email: 'henrique@test.com',  locale: 'pt', palette: 'default', theme: 'system' },
  { key: 'pietra',    firstName: 'Pietra',    lastName: 'Silva',     email: 'pietra@test.com',    locale: 'pt', palette: 'blossom'  },
  { key: 'lucas',     firstName: 'Lucas',     lastName: 'Oliveira',  email: 'lucas@test.com',     locale: 'pt'  },
  { key: 'isabela',   firstName: 'Isabela',   lastName: 'Ferreira',  email: 'isabela@test.com',   locale: 'pt', palette: 'lavender' },
  { key: 'gabriel',   firstName: 'Gabriel',   lastName: 'Santos',    email: 'gabriel@test.com',   locale: 'pt'  },
  { key: 'camila',    firstName: 'Camila',    lastName: 'Costa',     email: 'camila@test.com',    locale: 'pt', palette: 'blossom'  },
  { key: 'rafael',    firstName: 'Rafael',    lastName: 'Lima',      email: 'rafael@test.com',    locale: 'pt'  },
  { key: 'beatriz',   firstName: 'Beatriz',   lastName: 'Rocha',     email: 'beatriz@test.com',   locale: 'pt', palette: 'sky'      },
  { key: 'rodrigo',   firstName: 'Rodrigo',   lastName: 'Carvalho',  email: 'rodrigo@test.com',   locale: 'pt', theme: 'dark'       },
  { key: 'leticia',   firstName: 'Letícia',   lastName: 'Almeida',   email: 'leticia@test.com',   locale: 'pt'  },
  { key: 'eduardo',   firstName: 'Eduardo',   lastName: 'Martins',   email: 'eduardo@test.com',   locale: 'pt', palette: 'ocean'    },
  { key: 'mariana',   firstName: 'Mariana',   lastName: 'Ribeiro',   email: 'mariana@test.com',   locale: 'pt'  },
  { key: 'thiago',    firstName: 'Thiago',    lastName: 'Araújo',    email: 'thiago@test.com',    locale: 'pt', theme: 'dark'       },
  { key: 'natalia',   firstName: 'Natália',   lastName: 'Gomes',     email: 'natalia@test.com',   locale: 'pt', palette: 'lavender' },
  { key: 'bruno',     firstName: 'Bruno',     lastName: 'Barbosa',   email: 'bruno@test.com',     locale: 'pt'  },
  { key: 'fernanda',  firstName: 'Fernanda',  lastName: 'Correia',   email: 'fernanda@test.com',  locale: 'pt', palette: 'blossom'  },
  { key: 'mateus',    firstName: 'Mateus',    lastName: 'Teixeira',  email: 'mateus@test.com',    locale: 'pt'  },
  { key: 'julia',     firstName: 'Júlia',     lastName: 'Nascimento',email: 'julia@test.com',     locale: 'pt', palette: 'earth'    },
  { key: 'diego',     firstName: 'Diego',     lastName: 'Vieira',    email: 'diego@test.com',     locale: 'pt', theme: 'light'      },
  { key: 'larissa',   firstName: 'Larissa',   lastName: 'Mendes',    email: 'larissa@test.com',   locale: 'pt'  },
  { key: 'andre',     firstName: 'André',     lastName: 'Sousa',     email: 'andre@test.com',     locale: 'pt'  },
  { key: 'amanda',    firstName: 'Amanda',    lastName: 'Pereira',   email: 'amanda@test.com',    locale: 'pt', palette: 'sky'      },
  { key: 'vinicius',  firstName: 'Vinícius',  lastName: 'Monteiro',  email: 'vinicius@test.com',  locale: 'pt'  },
  { key: 'priscila',  firstName: 'Priscila',  lastName: 'Cardoso',   email: 'priscila@test.com',  locale: 'pt', palette: 'lavender' },
  { key: 'leonardo',  firstName: 'Leonardo',  lastName: 'Moreira',   email: 'leonardo@test.com',  locale: 'pt', theme: 'dark'       },
  { key: 'aline',     firstName: 'Aline',     lastName: 'Castro',    email: 'aline@test.com',     locale: 'pt'  },
  { key: 'gustavo',   firstName: 'Gustavo',   lastName: 'Freitas',   email: 'gustavo@test.com',   locale: 'pt', palette: 'ocean'    },
  { key: 'bianca',    firstName: 'Bianca',    lastName: 'Campos',    email: 'bianca@test.com',    locale: 'pt', palette: 'blossom'  },
  { key: 'joao',      firstName: 'João',      lastName: 'Ramos',     email: 'joao@test.com',      locale: 'pt'  },
  { key: 'rebeca',    firstName: 'Rebeca',    lastName: 'Dias',      email: 'rebeca@test.com',    locale: 'pt', palette: 'sky'      },
  { key: 'sergio',    firstName: 'Sérgio',    lastName: 'Azevedo',   email: 'sergio@test.com',    locale: 'pt', theme: 'dark'       },
  { key: 'vanessa',   firstName: 'Vanessa',   lastName: 'Lopes',     email: 'vanessa@test.com',   locale: 'pt'  },
  { key: 'marcos',    firstName: 'Marcos',    lastName: 'Cruz',      email: 'marcos@test.com',    locale: 'pt'  },
  { key: 'danielle',  firstName: 'Danielle',  lastName: 'Pinto',     email: 'danielle@test.com',  locale: 'pt', palette: 'lavender' },
  { key: 'paulo',     firstName: 'Paulo',     lastName: 'Xavier',    email: 'paulo@test.com',     locale: 'pt'  },
  // ── Portugueses ─────────────────────────────────────────────────────────
  { key: 'tiago_pt',  firstName: 'Tiago',     lastName: 'Fonseca',   email: 'tiago.pt@test.com',  locale: 'pt', palette: 'ocean'    },
  { key: 'sofia_pt',  firstName: 'Sofia',     lastName: 'Rodrigues', email: 'sofia.pt@test.com',  locale: 'pt'  },
  { key: 'nuno',      firstName: 'Nuno',      lastName: 'Machado',   email: 'nuno@test.com',      locale: 'pt', theme: 'dark'       },
  { key: 'ines',      firstName: 'Inês',      lastName: 'Melo',      email: 'ines@test.com',      locale: 'pt', palette: 'blossom'  },
  { key: 'rui',       firstName: 'Rui',       lastName: 'Marques',   email: 'rui@test.com',       locale: 'pt'  },
  // ── Argentinos ──────────────────────────────────────────────────────────
  { key: 'facundo',   firstName: 'Facundo',   lastName: 'García',    email: 'facundo@test.com',   locale: 'en'  },
  { key: 'valentina', firstName: 'Valentina', lastName: 'López',     email: 'valentina@test.com', locale: 'en', palette: 'blossom'  },
  { key: 'matias',    firstName: 'Matías',    lastName: 'Fernández', email: 'matias@test.com',    locale: 'en'  },
  { key: 'lucia_ar',  firstName: 'Lucía',     lastName: 'González',  email: 'lucia.ar@test.com',  locale: 'en', palette: 'lavender' },
  { key: 'agustin',   firstName: 'Agustín',   lastName: 'Martínez',  email: 'agustin@test.com',   locale: 'en', theme: 'dark'       },
  // ── Franceses ───────────────────────────────────────────────────────────
  { key: 'antoine',   firstName: 'Antoine',   lastName: 'Dupont',    email: 'antoine@test.com',   locale: 'en', palette: 'earth'    },
  { key: 'chloe',     firstName: 'Chloé',     lastName: 'Bernard',   email: 'chloe@test.com',     locale: 'en'  },
  { key: 'theo',      firstName: 'Théo',      lastName: 'Moreau',    email: 'theo@test.com',      locale: 'en', theme: 'dark'       },
  { key: 'emma_fr',   firstName: 'Emma',      lastName: 'Leroy',     email: 'emma.fr@test.com',   locale: 'en', palette: 'sky'      },
  { key: 'baptiste',  firstName: 'Baptiste',  lastName: 'Petit',     email: 'baptiste@test.com',  locale: 'en'  },
  // ── Alemães ─────────────────────────────────────────────────────────────
  { key: 'lukas',     firstName: 'Lukas',     lastName: 'Müller',    email: 'lukas@test.com',     locale: 'en', palette: 'ocean'    },
  { key: 'laura_de',  firstName: 'Laura',     lastName: 'Schmidt',   email: 'laura.de@test.com',  locale: 'en'  },
  { key: 'jan',       firstName: 'Jan',       lastName: 'Fischer',   email: 'jan@test.com',       locale: 'en', theme: 'dark'       },
  { key: 'anna_de',   firstName: 'Anna',      lastName: 'Weber',     email: 'anna.de@test.com',   locale: 'en', palette: 'lavender' },
  { key: 'tim',       firstName: 'Tim',       lastName: 'Wagner',    email: 'tim@test.com',       locale: 'en'  },
  // ── Japoneses ───────────────────────────────────────────────────────────
  { key: 'yuki',      firstName: 'Yuki',      lastName: 'Tanaka',    email: 'yuki@test.com',      locale: 'en', palette: 'sky'      },
  { key: 'kenji',     firstName: 'Kenji',     lastName: 'Sato',      email: 'kenji@test.com',     locale: 'en', theme: 'dark'       },
  { key: 'haruto',    firstName: 'Haruto',    lastName: 'Suzuki',    email: 'haruto@test.com',    locale: 'en'  },
  { key: 'sakura',    firstName: 'Sakura',    lastName: 'Yamamoto',  email: 'sakura@test.com',    locale: 'en', palette: 'blossom'  },
  { key: 'aoi',       firstName: 'Aoi',       lastName: 'Nakamura',  email: 'aoi@test.com',       locale: 'en', palette: 'lavender' },
  // ── Anglófonos ──────────────────────────────────────────────────────────
  { key: 'james',     firstName: 'James',     lastName: 'Wilson',    email: 'james@test.com',     locale: 'en', palette: 'ocean'    },
  { key: 'emily',     firstName: 'Emily',     lastName: 'Taylor',    email: 'emily@test.com',     locale: 'en'  },
  { key: 'oliver',    firstName: 'Oliver',    lastName: 'Brown',     email: 'oliver@test.com',    locale: 'en', theme: 'dark'       },
  { key: 'charlotte', firstName: 'Charlotte', lastName: 'Davies',    email: 'charlotte@test.com', locale: 'en', palette: 'blossom'  },
  { key: 'liam',      firstName: 'Liam',      lastName: 'Johnson',   email: 'liam@test.com',      locale: 'en'  },
]

// ─── Groups ─────────────────────────────────────────────────────────────────

type SeedGroup = {
  id: string
  name: string
  ownerKey: string
  memberKeys: string[]
  weekEvents: number
  olderEvents: number
}

// All-time total:  Praia(405) Turma(365) Buenos(301) Tokyo(270) London(240) Europa(248) Rio(228) ...
// Week total:      Praia(55)  Viagem(48) Turma(45)  Tokyo(40)  BuenosA(35) Paris(30)  ...
// All-time ≠ week ordering → world tab toggle is always meaningful.
// Henrique is in: Família Krause, Viagem SP, Trabalho BV, Turma da Facul, Europa 2025, Dev Team
const SEED_GROUPS: SeedGroup[] = [
  {
    id: 'sg-praia',
    name: 'Praia Galera',
    ownerKey: 'lucas',
    memberKeys: ['lucas', 'isabela', 'camila', 'rafael', 'beatriz'],
    weekEvents: 55, olderEvents: 350
  },
  {
    id: 'sg-turma',
    name: 'Turma da Facul',
    ownerKey: 'henrique',
    memberKeys: ['henrique', 'pietra', 'lucas', 'camila', 'rodrigo', 'leticia'],
    weekEvents: 45, olderEvents: 320
  },
  {
    id: 'sg-buenos',
    name: 'Buenos Aires Spotters',
    ownerKey: 'facundo',
    memberKeys: ['facundo', 'valentina', 'matias', 'lucia_ar', 'agustin'],
    weekEvents: 35, olderEvents: 266
  },
  {
    id: 'sg-tokyo',
    name: 'Tokyo Flyers',
    ownerKey: 'yuki',
    memberKeys: ['yuki', 'kenji', 'haruto', 'sakura', 'aoi'],
    weekEvents: 40, olderEvents: 230
  },
  {
    id: 'sg-europa',
    name: 'Europa 2025',
    ownerKey: 'henrique',
    memberKeys: ['henrique', 'antoine', 'chloe', 'lukas', 'james', 'emily'],
    weekEvents: 28, olderEvents: 220
  },
  {
    id: 'sg-london',
    name: 'London Spotters',
    ownerKey: 'james',
    memberKeys: ['james', 'emily', 'oliver', 'charlotte', 'liam'],
    weekEvents: 22, olderEvents: 218
  },
  {
    id: 'sg-rio',
    name: 'Rio Trip',
    ownerKey: 'rodrigo',
    memberKeys: ['rodrigo', 'natalia', 'thiago', 'mariana', 'eduardo'],
    weekEvents: 18, olderEvents: 210
  },
  {
    id: 'sg-paris',
    name: 'Paris Planewatchers',
    ownerKey: 'antoine',
    memberKeys: ['antoine', 'chloe', 'theo', 'emma_fr', 'baptiste'],
    weekEvents: 30, olderEvents: 175
  },
  {
    id: 'sg-viagem',
    name: 'Viagem SP',
    ownerKey: 'henrique',
    memberKeys: ['henrique', 'pietra', 'lucas', 'camila'],
    weekEvents: 48, olderEvents: 100
  },
  {
    id: 'sg-cariocas',
    name: 'Cariocas United',
    ownerKey: 'mariana',
    memberKeys: ['mariana', 'thiago', 'larissa', 'andre', 'vinicius'],
    weekEvents: 20, olderEvents: 140
  },
  {
    id: 'sg-berlin',
    name: 'Berlin Aviatik',
    ownerKey: 'lukas',
    memberKeys: ['lukas', 'laura_de', 'jan', 'anna_de', 'tim'],
    weekEvents: 25, olderEvents: 125
  },
  {
    id: 'sg-floripa',
    name: 'Floripa 2024',
    ownerKey: 'gabriel',
    memberKeys: ['gabriel', 'amanda', 'vinicius', 'priscila', 'bianca'],
    weekEvents: 18, olderEvents: 108
  },
  {
    id: 'sg-mundial',
    name: 'Mundial 2026',
    ownerKey: 'paulo',
    memberKeys: ['paulo', 'marcos', 'danielle', 'sergio', 'vanessa', 'diego'],
    weekEvents: 22, olderEvents: 100
  },
  {
    id: 'sg-familia-krause',
    name: 'Família Krause',
    ownerKey: 'henrique',
    memberKeys: ['henrique', 'pietra', 'joao'],
    weekEvents: 12, olderEvents: 95
  },
  {
    id: 'sg-lisbon',
    name: 'Lisbon Skywatchers',
    ownerKey: 'tiago_pt',
    memberKeys: ['tiago_pt', 'sofia_pt', 'nuno', 'ines', 'rui'],
    weekEvents: 15, olderEvents: 80
  },
  {
    id: 'sg-bairro',
    name: 'Amigos do Bairro',
    ownerKey: 'leonardo',
    memberKeys: ['leonardo', 'aline', 'gustavo', 'bianca'],
    weekEvents: 14, olderEvents: 75
  },
  {
    id: 'sg-familia-silva',
    name: 'Família Silva',
    ownerKey: 'pietra',
    memberKeys: ['pietra', 'rafael', 'leticia', 'mateus'],
    weekEvents: 10, olderEvents: 68
  },
  {
    id: 'sg-dev',
    name: 'Dev Team',
    ownerKey: 'henrique',
    memberKeys: ['henrique', 'rodrigo', 'leonardo', 'gustavo'],
    weekEvents: 8, olderEvents: 62
  },
  {
    id: 'sg-churras',
    name: 'Galera do Churras',
    ownerKey: 'thiago',
    memberKeys: ['thiago', 'rodrigo', 'eduardo', 'bruno', 'fernanda', 'julia'],
    weekEvents: 14, olderEvents: 56
  },
  {
    id: 'sg-academia',
    name: 'Grupo da Academia',
    ownerKey: 'rebeca',
    memberKeys: ['rebeca', 'vanessa', 'danielle'],
    weekEvents: 8, olderEvents: 42
  },
  {
    id: 'sg-trabalho',
    name: 'Trabalho BV',
    ownerKey: 'henrique',
    memberKeys: ['henrique', 'mariana', 'paulo'],
    weekEvents: 6, olderEvents: 40
  },
  {
    id: 'sg-startup',
    name: 'Startup Crew',
    ownerKey: 'diego',
    memberKeys: ['diego', 'mateus', 'julia', 'larissa'],
    weekEvents: 8, olderEvents: 32
  },
  {
    id: 'sg-marketing',
    name: 'Marketing SP',
    ownerKey: 'amanda',
    memberKeys: ['amanda', 'bianca', 'sergio'],
    weekEvents: 5, olderEvents: 28
  },
  {
    id: 'sg-familia-lima',
    name: 'Família Lima',
    ownerKey: 'rafael',
    memberKeys: ['rafael', 'beatriz', 'joao'],
    weekEvents: 4, olderEvents: 20
  },
  {
    id: 'sg-casal',
    name: 'Casal Feliz',
    ownerKey: 'gabriel',
    memberKeys: ['gabriel', 'isabela'],
    weekEvents: 0, olderEvents: 0
  },
]

const PRIMARY_USER_KEY = 'henrique'
const PRIMARY_ACTIVE_GROUP = 'sg-viagem'

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding database…')

  const now = Date.now()
  const nowDate = new Date()
  const idByKey = new Map<string, string>()

  // ── Users ────────────────────────────────────────────────────────────────
  console.log(`\n👤 Upserting ${SEED_USERS.length} users…`)
  const hash = await hashPassword('password123')

  for (const u of SEED_USERS) {
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
      .set({ firstName: u.firstName, lastName: u.lastName, name: `${u.firstName} ${u.lastName}`, onboardingStatus: 'complete', updatedAt: nowDate })
      .where(eq(users.email, u.email))

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1)
    if (!user) continue

    await db
      .insert(accounts)
      .values({ id: randomUUID(), accountId: user.id, providerId: 'credential', userId: user.id, password: hash, createdAt: nowDate, updatedAt: nowDate })
      .onConflictDoNothing()

    await db
      .insert(preferences)
      .values({ userId: user.id, locale: u.locale, palette: u.palette ?? 'default', theme: u.theme ?? 'system' })
      .onConflictDoUpdate({ target: preferences.userId, set: { locale: u.locale, palette: u.palette ?? 'default', theme: u.theme ?? 'system' } })

    idByKey.set(u.key, user.id)
  }
  console.log(`  ✓ ${idByKey.size} users ready`)

  // ── Groups & Events ──────────────────────────────────────────────────────
  console.log(`\n🏷️  Upserting ${SEED_GROUPS.length} groups…`)
  let totalEvents = 0

  for (const g of SEED_GROUPS) {
    const ownerId = idByKey.get(g.ownerKey)
    if (!ownerId) {
      console.warn(`  ⚠ skip "${g.name}" — owner key "${g.ownerKey}" not found`)
      continue
    }

    await db
      .insert(groups)
      .values({ id: g.id, name: g.name, ownerId, createdAt: now })
      .onConflictDoUpdate({ target: groups.id, set: { name: g.name, ownerId } })

    const memberIds = g.memberKeys
      .map((k) => idByKey.get(k))
      .filter((id): id is string => Boolean(id))

    if (memberIds.length > 0) {
      await db
        .insert(groupMembers)
        .values(memberIds.map((userId) => ({
          groupId: g.id,
          userId,
          role: (userId === ownerId ? 'owner' : 'member') as 'owner' | 'member',
          joinedAt: now
        })))
        .onConflictDoNothing()
    }

    const evtRows = buildEvents(g.id, memberIds, g.weekEvents, g.olderEvents, now)
    if (evtRows.length > 0) {
      // Insert in chunks of 500 to avoid parameter limits
      for (let i = 0; i < evtRows.length; i += 500) {
        await db.insert(events).values(evtRows.slice(i, i + 500)).onConflictDoNothing()
      }
      totalEvents += evtRows.length
    }

    const total = g.weekEvents + g.olderEvents
    console.log(`  ✓ "${g.name}" — ${memberIds.length} members, ${total} events`)
  }

  // ── Active group for primary user ────────────────────────────────────────
  const primaryId = idByKey.get(PRIMARY_USER_KEY)
  if (primaryId) {
    await db
      .insert(preferences)
      .values({ userId: primaryId, activeGroupId: PRIMARY_ACTIVE_GROUP })
      .onConflictDoUpdate({ target: preferences.userId, set: { activeGroupId: PRIMARY_ACTIVE_GROUP } })
  }

  const groupCount = SEED_GROUPS.filter((g) => idByKey.has(g.ownerKey)).length
  console.log(`\n✅ Done.`)
  console.log(`   ${idByKey.size} users · ${groupCount} groups · ${totalEvents} events`)
  console.log(`   Sign in as henrique@test.com / password123`)
  process.exit(0)
}

// ─── Event builder ───────────────────────────────────────────────────────────

function buildEvents(
  groupId: string,
  memberIds: string[],
  weekEvents: number,
  olderEvents: number,
  now: number
) {
  if (memberIds.length === 0) return []

  const rows: { clientId: string; who: string; groupId: string; ts: number }[] = []

  const weekStart = now - 6 * DAY_MS
  const olderStart = now - 90 * DAY_MS
  const olderEnd = now - 7 * DAY_MS

  for (let i = 0; i < weekEvents; i++) {
    rows.push({
      clientId: `se:${groupId}:w:${i}`,
      who: memberIds[i % memberIds.length],
      groupId,
      ts: randomTs(weekStart, now)
    })
  }

  for (let i = 0; i < olderEvents; i++) {
    rows.push({
      clientId: `se:${groupId}:o:${i}`,
      who: memberIds[i % memberIds.length],
      groupId,
      ts: randomTs(olderStart, olderEnd)
    })
  }

  return rows
}

// Biased toward daytime hours (8h–21h) — slightly more realistic
function randomTs(start: number, end: number): number {
  const raw = start + rand() * (end - start)
  const date = new Date(raw)
  // Shift toward 8h-21h range
  const hour = 8 + Math.floor(rand() * 13)
  date.setHours(hour, ri(0, 59), ri(0, 59))
  const t = date.getTime()
  // Clamp to window
  return Math.max(start, Math.min(end, t))
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
