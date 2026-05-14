import 'server-only'

import type { Locale } from '@airplanes/types'
import { cookies } from 'next/headers'

const LOCALE_COOKIE = 'ap_locale'

export async function readLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value
  return v === 'en' ? 'en' : 'pt'
}
