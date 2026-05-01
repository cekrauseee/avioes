import { bigint, pgEnum, pgTable, serial } from 'drizzle-orm/pg-core'

export const identityEnum = pgEnum('identity', ['henrique', 'pietra'])
export const themeEnum = pgEnum('theme', ['light', 'dark', 'system'])

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  who: identityEnum('who').notNull(),
  ts: bigint('ts', { mode: 'number' }).notNull()
})

export const preferences = pgTable('preferences', {
  who: identityEnum('who').primaryKey(),
  theme: themeEnum('theme').notNull().default('system')
})
