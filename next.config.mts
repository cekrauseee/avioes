import type { NextConfig } from 'next'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  turbopack: {
    root: __dirname
  }
}

export default nextConfig
