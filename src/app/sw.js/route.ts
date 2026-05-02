import { readFileSync } from 'fs'
import { join } from 'path'

let cachedBuildId: string | null = null

function getBuildId(): string {
  if (cachedBuildId) return cachedBuildId
  try {
    cachedBuildId = readFileSync(join(process.cwd(), '.next', 'BUILD_ID'), 'utf-8').trim()
  } catch {
    cachedBuildId = `dev-${Date.now()}`
  }
  return cachedBuildId
}

const SW_TEMPLATE = `const CACHE = 'airplanes-__VERSION__'
const SHELL_ROUTES = ['/', '/diary', '/scoreboard']
const PRECACHE = ['/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'refresh-shell') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE)
      await Promise.all(
        SHELL_ROUTES.map(async (url) => {
          try {
            const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' })
            if (res.ok) await cache.put(url, res.clone())
          } catch {}
        })
      )
    })())
  }
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  const isNav = req.mode === 'navigate'
  const isRsc = req.headers.get('rsc') === '1' || req.headers.has('next-router-state-tree')
  const isShellPath = SHELL_ROUTES.indexOf(url.pathname) !== -1
  if (!isNav && !(isRsc && isShellPath)) return

  event.respondWith(
    fetch(req)
      .then(async (res) => {
        if (res.ok) {
          const copy = res.clone()
          await caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(req).then((r) => r || (isNav ? caches.match('/') : Response.error())))
  )
})
`

export async function GET() {
  const body = SW_TEMPLATE.replace('__VERSION__', getBuildId())
  return new Response(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}
