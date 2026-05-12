import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

const url = process.env.DATABASE_URL!
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.join(__dirname, '../drizzle')

async function main() {
  const db = drizzle(url)

  const result = await db.execute(
    sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations') AS exists`
  )
  const tableExists = result.rows[0]?.exists === true

  if (!tableExists) {
    console.log('First migration run — bootstrapping baseline...')

    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`)
    await db.execute(sql`
      CREATE TABLE "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `)

    const journal = JSON.parse(fs.readFileSync(path.join(migrationsFolder, 'meta/_journal.json'), 'utf8'))
    const baselineEntry = journal.entries.find((e: { idx: number }) => e.idx === 0)
    if (!baselineEntry) throw new Error('Baseline entry (idx 0) not found in journal')

    const baselineSql = fs.readFileSync(path.join(migrationsFolder, `${baselineEntry.tag}.sql`), 'utf8')
    const hash = crypto.createHash('sha256').update(baselineSql).digest('hex')

    await db.execute(sql.raw(
      `INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ('${hash}', ${baselineEntry.when})`
    ))

    console.log(`Baseline ${baselineEntry.tag}.sql marked as applied (schema already exists)`)
  }

  await migrate(db, { migrationsFolder })
  console.log('All migrations applied.')

  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
