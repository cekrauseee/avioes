'use client'

import { passkeyClient } from '@better-auth/passkey/client'
import { emailOTPClient, inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import type { auth } from './server'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:3000',
  plugins: [inferAdditionalFields<typeof auth>(), emailOTPClient(), passkeyClient()]
})
