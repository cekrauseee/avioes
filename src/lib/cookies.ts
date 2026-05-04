import 'server-only'

import { cookies } from 'next/headers'
import type { Locale } from './types'

const LOCALE_COOKIE = 'ap_locale'

export async function readLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value
  return v === 'en' ? 'en' : 'pt'
}
