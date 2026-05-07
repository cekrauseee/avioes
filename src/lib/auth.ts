import 'server-only'

import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'
import { db } from './db'
import { accounts, passkeys, sessions, users, verifications } from './db/auth-schema'
import { sendOtpEmail } from './email'
import { OTP_ALLOWED_ATTEMPTS, OTP_EXPIRES_IN_SECONDS, OTP_LENGTH } from './otp-constants'
import { findUserByEmail, readLocale } from './store'

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
  emailAndPassword: {
    enabled: true,
    autoSignIn: true
  },
  user: {
    additionalFields: {
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      username: { type: 'string', required: false },
      onboardingStatus: { type: 'string', required: false, defaultValue: 'pending', input: false }
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
        const user = await findUserByEmail(email)
        const locale = await readLocale(user?.id ?? null)
        await sendOtpEmail(email, otp, Math.round(OTP_EXPIRES_IN_SECONDS / 60), locale)
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
    if (!s && process.env.NODE_ENV !== 'development') {
      throw new Error('BETTER_AUTH_SECRET must be set outside local dev')
    }
    return s ?? 'dev-secret-change-in-production-32ch'
  })(),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
})

export type Session = typeof auth.$Infer.Session
