import type { NextConfig } from 'next'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const csp = [
  "default-src 'self'",
  "script-src 'self' 'sha256-Srh4tKBk+wg1ZdTYf5aJkOXjZK3e0sDUA0k3iEdMDxk=' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.googleusercontent.com",
  "font-src 'self'",
  "connect-src 'self' https://*.vercel-analytics.com https://*.vercel-insights.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
]

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  turbopack: {
    root: __dirname
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  }
}

export default nextConfig
