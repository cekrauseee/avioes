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
  user: {
    additionalFields: {
      firstName: { type: 'string', required: true },
      lastName: { type: 'string', required: false }
    }
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
      updateUserInfoOnLink: true
    }
  },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ?
      {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          mapProfileToUser: (profile: { given_name?: string; family_name?: string; name?: string }) => {
            const firstName = profile.given_name ?? profile.name?.split(' ')[0] ?? ''
            const out: { firstName: string; lastName?: string } = { firstName }
            if (profile.family_name) out.lastName = profile.family_name
            return out
          }
        }
      }
    : undefined,
  secret: (() => {
    const s = process.env.BETTER_AUTH_SECRET
    if (!s && process.env.NODE_ENV !== 'development') {
      throw new Error('BETTER_AUTH_SECRET must be set outside local dev')
    }
    return s ?? 'dev-secret-change-in-production-32ch'
  })(),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
})

export type Session = typeof auth.$Infer.Session
