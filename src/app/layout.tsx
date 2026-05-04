import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import { AppRuntime } from '../components/app-runtime'
import { Noise } from '../components/noise'
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
  return (
    <html
      lang='pt-BR'
      data-theme='system'
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className='bg-bg text-ink flex min-h-full flex-col overflow-hidden'>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var b=JSON.parse(localStorage.getItem('ap_boot')||'{}');if(b.theme)d.dataset.theme=b.theme;if(b.palette)d.dataset.palette=b.palette;var u=function(){d.dataset.offline=navigator.onLine?'':'1'};u();addEventListener('online',u);addEventListener('offline',u)}catch(e){}})()`
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
