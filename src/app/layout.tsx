import type { Metadata, Viewport } from 'next'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import { NavBar } from '../components/nav-bar'
import { Noise } from '../components/noise'
import { PwaRegister } from '../components/pwa-register'
import { readIdentity } from '../lib/cookies'
import { readTheme } from '../lib/store'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['SOFT', 'opsz']
})

export const metadata: Metadata = {
  title: 'Aviões',
  description: 'O diário de aviões da gente.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Aviões',
    statusBarStyle: 'default'
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f1e7' },
    { media: '(prefers-color-scheme: dark)', color: '#15191b' }
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const who = await readIdentity()
  const theme = await readTheme(who)

  return (
    <html
      lang='pt-BR'
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className='bg-bg text-ink flex min-h-full flex-col overflow-hidden'>
        <Noise />
        <div className='mx-auto flex w-full max-w-[420px] flex-1 flex-col overflow-hidden'>{children}</div>
        {who && <NavBar who={who} />}
        <PwaRegister />
      </body>
    </html>
  )
}
