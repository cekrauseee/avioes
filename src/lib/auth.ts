import 'server-only'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
import { accounts, sessions, users, verifications } from './db/auth-schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications
    }
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true
  },
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-in-production-32ch',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
})

export type Session = typeof auth.$Infer.Session
