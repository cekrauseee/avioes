import 'server-only'

import { cookies } from 'next/headers'
import type { Identity, Locale } from './types'

const ID_COOKIE = 'ap_id'
const INTRO_COOKIE = 'ap_intro'
const LOCALE_COOKIE = 'ap_locale'
const ONE_YEAR = 60 * 60 * 24 * 365

export async function readIdentity(): Promise<Identity | null> {
  const v = (await cookies()).get(ID_COOKIE)?.value
  return v === 'henrique' || v === 'pietra' ? v : null
}

export async function writeIdentity(who: Identity) {
  ;(await cookies()).set(ID_COOKIE, who, {
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  })
}

export async function deleteIdentity() {
  ;(await cookies()).delete(ID_COOKIE)
}

export async function readIntroSeen(): Promise<boolean> {
  return (await cookies()).get(INTRO_COOKIE)?.value === '1'
}

export async function readLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value
  return v === 'en' ? 'en' : 'pt'
}

export async function writeIntroSeen() {
  ;(await cookies()).set(INTRO_COOKIE, '1', {
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  })
}
