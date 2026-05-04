import { bigint, pgEnum, pgTable, serial, text } from 'drizzle-orm/pg-core'

export const identityEnum = pgEnum('identity', ['henrique', 'pietra'])
export const themeEnum = pgEnum('theme', ['light', 'dark', 'system'])
export const paletteEnum = pgEnum('palette', ['default', 'ocean', 'lavender', 'earth', 'blossom', 'sky'])

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  clientId: text('client_id').unique(),
  who: identityEnum('who').notNull(),
  ts: bigint('ts', { mode: 'number' }).notNull()
})

export const preferences = pgTable('preferences', {
  who: identityEnum('who').primaryKey(),
  theme: themeEnum('theme').notNull().default('system'),
  palette: paletteEnum('palette').notNull().default('default')
})

export const processedOps = pgTable('processed_ops', {
  id: text('id').primaryKey()
})
