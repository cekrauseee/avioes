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
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Aviões',
    template: '%s \\ Aviões'
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

const APPLE_SPLASH_SCREENS = [
  { w: 375, h: 667, r: 2, tag: '750x1334' },
  { w: 390, h: 844, r: 3, tag: '1170x2532' },
  { w: 393, h: 852, r: 3, tag: '1179x2556' },
  { w: 428, h: 926, r: 3, tag: '1284x2778' },
  { w: 430, h: 932, r: 3, tag: '1290x2796' },
  { w: 820, h: 1180, r: 2, tag: '1640x2360' },
  { w: 834, h: 1194, r: 2, tag: '1668x2388' },
  { w: 1024, h: 1366, r: 2, tag: '2048x2732' }
] as const

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
      <head>
        {APPLE_SPLASH_SCREENS.flatMap(({ w, h, r, tag }) => [
          <link
            key={`splash-light-${tag}`}
            rel='apple-touch-startup-image'
            href={`/splash/splash-light-${tag}.png`}
            media={`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait) and (prefers-color-scheme: light)`}
          />,
          <link
            key={`splash-dark-${tag}`}
            rel='apple-touch-startup-image'
            href={`/splash/splash-dark-${tag}.png`}
            media={`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait) and (prefers-color-scheme: dark)`}
          />
        ])}
      </head>
      <body
        className='bg-bg text-ink flex min-h-full flex-col overflow-hidden'
        style={{ backgroundColor: '#f6f1e7' }}
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var b=JSON.parse(localStorage.getItem('ap_boot')||'{}');if(b.theme)d.dataset.theme=b.theme;if(b.palette)d.dataset.palette=b.palette;var dk=b.theme==='dark'||(b.theme!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(dk)document.body.style.backgroundColor='#15191b';var l=b.locale||((navigator.language||'').slice(0,2)==='pt'?'pt':'en');d.lang=l==='en'?'en':'pt-BR';var u=function(){d.dataset.offline=navigator.onLine?'':'1'};u();addEventListener('online',u);addEventListener('offline',u)}catch(e){}})()`
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
