import 'server-only'

import { cookies } from 'next/headers'
import type { Identity } from './types'

const ID_COOKIE = 'ap_id'
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
