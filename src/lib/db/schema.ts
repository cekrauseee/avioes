import { sql } from 'drizzle-orm'
import { bigint, boolean, index, pgEnum, pgTable, primaryKey, serial, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './auth-schema'

export const themeEnum = pgEnum('theme', ['light', 'dark', 'system'])
export const paletteEnum = pgEnum('palette', ['default', 'ocean', 'lavender', 'earth', 'blossom', 'sky'])
export const localeEnum = pgEnum('locale', ['pt', 'en'])
export const groupRoleEnum = pgEnum('group_role', ['owner', 'member'])
export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'accepted', 'rejected', 'cancelled', 'expired'])

export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: bigint('created_at', { mode: 'number' }).notNull()
})

export const groupMembers = pgTable(
  'group_members',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: groupRoleEnum('role').notNull().default('member'),
    joinedAt: bigint('joined_at', { mode: 'number' }).notNull()
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })]
)

export const groupInvitations = pgTable(
  'group_invitations',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    invitedEmail: text('invited_email').notNull(),
    invitedByUserId: text('invited_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: invitationStatusEnum('status').notNull().default('pending'),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    expiresAt: bigint('expires_at', { mode: 'number' }).notNull()
  },
  (t) => [
    uniqueIndex('unique_pending_invite_per_group_email')
      .on(t.groupId, t.invitedEmail)
      .where(sql`status = 'pending'`)
  ]
)

export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    clientId: text('client_id').unique(),
    who: text('who').notNull(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    ts: bigint('ts', { mode: 'number' }).notNull()
  },
  (t) => [index('idx_events_group_ts').on(t.groupId, t.ts)]
)

export const preferences = pgTable('preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  theme: themeEnum('theme').notNull().default('system'),
  palette: paletteEnum('palette').notNull().default('default'),
  locale: localeEnum('locale').notNull().default('pt'),
  activeGroupId: text('active_group_id')
})

export const processedOps = pgTable('processed_ops', {
  id: text('id').primaryKey()
})

export const notificationTypeEnum = pgEnum('notification_type', ['group_invite', 'invite_accepted', 'invite_rejected'])

export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    data: text('data').notNull(),
    referenceId: text('reference_id'),
    read: boolean('read').notNull().default(false),
    createdAt: bigint('created_at', { mode: 'number' }).notNull()
  },
  (t) => [index('idx_notifications_user_created').on(t.userId, t.createdAt), index('idx_notifications_reference').on(t.referenceId)]
)

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull()
  },
  (t) => [index('idx_push_subscriptions_user').on(t.userId), uniqueIndex('idx_push_subscriptions_endpoint').on(t.endpoint)]
)

export { accounts, passkeys, sessions, users, verifications } from './auth-schema'
