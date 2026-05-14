import { DATE_LOCALE, detectLocaleFromHeader } from '@airplanes/i18n'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Aviões — Backoffice',
  robots: { index: false, follow: false }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const h = await headers()
  const locale = detectLocaleFromHeader(h.get('accept-language'))
  return (
    <html lang={DATE_LOCALE[locale]}>
      <body>{children}</body>
    </html>
  )
}
