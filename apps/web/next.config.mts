import type { NextConfig } from 'next'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
]

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  transpilePackages: ['@airplanes/db', '@airplanes/auth', '@airplanes/types', '@airplanes/i18n'],
  turbopack: {
    root: resolve(__dirname, '../..')
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  }
}

export default nextConfig
