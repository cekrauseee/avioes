import { LandingPage } from '@/components/landing-page'
import { detectLocaleFromHeader, t } from '@airplanes/i18n'
import type { Locale } from '@airplanes/types'
import { cookies, headers } from 'next/headers'

async function resolveLocale(): Promise<Locale> {
  const jar = await cookies()
  const saved = jar.get('ap_locale')?.value
  if (saved === 'pt' || saved === 'en') return saved
  const h = await headers()
  return detectLocaleFromHeader(h.get('accept-language'))
}

export async function generateMetadata() {
  const locale = await resolveLocale()
  return {
    title: t(locale, 'landing.metaTitle'),
    description: t(locale, 'landing.metaDescription')
  }
}

export default async function LandingRoute() {
  const locale = await resolveLocale()
  return <LandingPage locale={locale} />
}
