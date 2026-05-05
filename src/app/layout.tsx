import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import { headers } from 'next/headers'
import { AppRuntime } from '../components/app-runtime'
import { Noise } from '../components/noise'
import { detectLocaleFromHeader } from '../lib/i18n'
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
  title: {
    default: 'Airplanes',
    template: '%s \\ Airplanes'
  },
  description: 'O diário de aviões da gente.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-light.png', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-dark.png', type: 'image/png', media: '(prefers-color-scheme: dark)' }
    ],
    apple: '/icons/icon-1024.png'
  },
  appleWebApp: {
    capable: true,
    title: 'Airplanes',
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
  const h = await headers()
  const detectedLocale = detectLocaleFromHeader(h.get('accept-language'))
  const htmlLang = detectedLocale === 'pt' ? 'pt-BR' : 'en'

  return (
    <html
      lang={htmlLang}
      data-theme='system'
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased select-none`}
    >
      <body className='bg-bg text-ink flex min-h-full flex-col overflow-hidden'>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var b=JSON.parse(localStorage.getItem('ap_boot')||'{}');if(b.theme)d.dataset.theme=b.theme;if(b.palette)d.dataset.palette=b.palette;var l=b.locale||((navigator.language||'').slice(0,2)==='pt'?'pt':'en');d.lang=l==='en'?'en':'pt-BR';var u=function(){d.dataset.offline=navigator.onLine?'':'1'};u();addEventListener('online',u);addEventListener('offline',u)}catch(e){}})()`
          }}
        />
        <Noise />
        <AppRuntime>{children}</AppRuntime>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
