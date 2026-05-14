import 'server-only'

import { accounts, db, passkeys, sessions, users, verifications } from '@airplanes/db'
import { findUserByEmail, readLocale } from '@airplanes/db/store'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'
import { AsyncLocalStorage } from 'node:async_hooks'
import { sendOtpEmail } from './email/email'
import { OTP_ALLOWED_ATTEMPTS, OTP_EXPIRES_IN_SECONDS, OTP_LENGTH } from './otp-constants'

const otpErrorStore = new AsyncLocalStorage<{ error: string | null }>()

export function withOtpErrorScope<T>(fn: () => Promise<T>): Promise<T> {
  return otpErrorStore.run({ error: null }, fn)
}

export function consumeOtpSendError(): string | null {
  const store = otpErrorStore.getStore()
  if (!store) return null
  const err = store.error
  store.error = null
  return err
}

const cookieDomain = process.env.COOKIE_DOMAIN || undefined
const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(',')
  .map((s) => s.trim())
  .filter(Boolean) ?? []

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      passkey: passkeys
    }
  }),
  trustedOrigins,
  advanced: cookieDomain
    ? {
        crossSubDomainCookies: { enabled: true, domain: cookieDomain },
        defaultCookieAttributes: { sameSite: 'lax' as const, secure: true, domain: cookieDomain }
      }
    : undefined,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true
  },
  user: {
    additionalFields: {
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      username: { type: 'string', required: false },
      onboardingStatus: { type: 'string', required: false, defaultValue: 'pending', input: false },
      featureFlags: { type: 'string[]', required: false, input: false }
    }
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
      updateUserInfoOnLink: true
    }
  },
  plugins: [
    passkey(),
    emailOTP({
      otpLength: OTP_LENGTH,
      expiresIn: OTP_EXPIRES_IN_SECONDS,
      allowedAttempts: OTP_ALLOWED_ATTEMPTS,
      disableSignUp: true,
      sendVerificationOnSignUp: false,
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== 'sign-in') return
        const store = otpErrorStore.getStore()
        if (store) store.error = null
        try {
          const user = await findUserByEmail(email)
          const locale = await readLocale(user?.id ?? null)
          await sendOtpEmail(email, otp, Math.round(OTP_EXPIRES_IN_SECONDS / 60), locale)
        } catch {
          if (store) store.error = email
        }
      }
    })
  ],
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
    if (!s && (process.env.NODE_ENV !== 'development' || process.env.VERCEL)) {
      throw new Error('BETTER_AUTH_SECRET must be set outside local dev')
    }
    if (!s) console.warn('[auth] Using dev fallback secret — set BETTER_AUTH_SECRET for production')
    return s ?? 'dev-secret-change-in-production-32ch'
  })(),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
})

export type Session = typeof auth.$Infer.Session
