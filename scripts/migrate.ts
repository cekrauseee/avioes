import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.resolve(scriptDir, '../drizzle')

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  const pool = new pg.Pool({ connectionString: url })
  try {
    await seedBaselineIfNeeded(pool)
    const { drizzle } = await import('drizzle-orm/node-postgres')
    const { migrate } = await import('drizzle-orm/node-postgres/migrator')
    const db = drizzle(pool)
    await migrate(db, { migrationsFolder })
    console.log('Migrations applied successfully.')
  } finally {
    await pool.end()
  }
}

async function seedBaselineIfNeeded(pool: pg.Pool) {
  const { rows: tableCheck } = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '__drizzle_migrations'
    ) AS "exists"
  `)
  if (tableCheck[0].exists) {
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM "__drizzle_migrations"')
    if (rows[0].n > 0) return
  }

  const { rows: userCheck } = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user'
    ) AS "exists"
  `)
  if (!userCheck[0].exists) return

  console.log('Existing database detected without migration records. Seeding baseline…')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint NOT NULL
    )
  `)

  const journal = JSON.parse(fs.readFileSync(path.join(migrationsFolder, 'meta/_journal.json'), 'utf-8'))
  for (const entry of journal.entries as { tag: string; when: number }[]) {
    const sql = fs.readFileSync(path.join(migrationsFolder, `${entry.tag}.sql`), 'utf-8')
    const hash = crypto.createHash('sha256').update(sql).digest('hex')
    await pool.query('INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)', [hash, entry.when])
    console.log(`  Marked as applied: ${entry.tag}`)
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
