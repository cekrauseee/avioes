import { Redis } from '@upstash/redis'
import type { Flight } from '../../../lib/geo'

const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'
const STATES_URL = 'https://opensky-network.org/api/states/all'
const CACHE_TTL_S = 22
const REDIS_KEY = 'opensky:states'
const ROTATION_KEY = 'opensky:rotation'
const NM_TO_KM = 1.852
const EARTH_R_KM = 6371

type OpenSkyClient = { id: string; secret: string }

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

let clientsCache: OpenSkyClient[] | null = null

function getClients(): OpenSkyClient[] {
  if (clientsCache) return clientsCache
  const json = process.env.OPENSKY_CLIENTS
  if (json) {
    try {
      clientsCache = JSON.parse(json) as OpenSkyClient[]
      return clientsCache
    } catch {
      // fall through
    }
  }
  const id = process.env.OPENSKY_CLIENT_ID
  const secret = process.env.OPENSKY_CLIENT_SECRET
  clientsCache = id && secret ? [{ id, secret }] : []
  return clientsCache
}

const tokenCaches = new Map<string, { token: string; expiresAt: number }>()

async function getAccessToken(client: OpenSkyClient): Promise<string | null> {
  const cached = tokenCaches.get(client.id)
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.token
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: client.id,
    client_secret: client.secret
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store'
  })
  if (!res.ok) return null
  const data = (await res.json()) as { access_token: string; expires_in: number }
  tokenCaches.set(client.id, {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  })
  return data.access_token
}

async function pickClient(redis: Redis | null): Promise<OpenSkyClient | null> {
  const clients = getClients()
  if (clients.length === 0) return null
  if (clients.length === 1) return clients[0]

  let idx = 0
  if (redis) {
    try {
      idx = await redis.incr(ROTATION_KEY)
    } catch {
      idx = Math.floor(Math.random() * clients.length)
    }
  } else {
    idx = Math.floor(Math.random() * clients.length)
  }
  return clients[idx % clients.length]
}

async function fetchStatesFromOpenSky(redis: Redis | null): Promise<{ flights: Flight[]; time: number }> {
  const client = await pickClient(redis)
  if (!client) return { flights: [], time: Date.now() }

  const token = await getAccessToken(client)
  if (!token) return { flights: [], time: Date.now() }

  const res = await fetch(STATES_URL, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  })
  if (!res.ok) return { flights: [], time: Date.now() }

  const data = (await res.json()) as { time?: number; states?: unknown[][] }
  const states = data.states ?? []
  const flights: Flight[] = []

  for (const s of states) {
    const onGround = s[8] as boolean
    if (onGround) continue
    const lat = s[6] as number | null
    const lon = s[5] as number | null
    if (lat == null || lon == null) continue
    flights.push({
      icao24: (s[0] as string) ?? '',
      callsign: ((s[1] as string) ?? '').trim(),
      originCountry: (s[2] as string) ?? '',
      lat,
      lon,
      altitude: (s[7] as number) ?? 0,
      velocity: (s[9] as number) ?? 0,
      heading: (s[10] as number) ?? 0,
      verticalRate: (s[11] as number) ?? 0,
      onGround: false
    })
  }

  return { flights, time: data.time ? data.time * 1000 : Date.now() }
}

type StatesResult = { flights: Flight[]; time: number; cachedAt: number; cached: boolean }

async function getAllStates(force = false): Promise<StatesResult> {
  const redis = getRedis()

  if (!force && redis) {
    try {
      const entry = await redis.get<{ flights: Flight[]; time: number; cachedAt: number }>(REDIS_KEY)
      if (entry) return { ...entry, cached: true }
    } catch {
      // Upstash unavailable — fall through to live fetch
    }
  }

  const result = await fetchStatesFromOpenSky(redis)
  const now = Date.now()

  if (redis && result.flights.length > 0) {
    try {
      await redis.set(REDIS_KEY, { ...result, cachedAt: now }, { ex: CACHE_TTL_S })
    } catch {
      // Upstash unavailable — no-op
    }
  }

  return { ...result, cachedAt: now, cached: false }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const force = url.searchParams.get('force') === '1'
  const lat = parseFloat(url.searchParams.get('lat') ?? '')
  const lon = parseFloat(url.searchParams.get('lon') ?? '')
  const distRaw = parseFloat(url.searchParams.get('dist') ?? '')
  const distNm = Number.isFinite(distRaw) && distRaw > 0 ? Math.min(distRaw, 1000) : 250

  const { flights, time, cached, cachedAt } = await getAllStates(force)
  const meta = { time, cached, cachedAt, ttl: CACHE_TTL_S }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ flights, ...meta }, { headers: cacheHeaders() })
  }

  const distKm = distNm * NM_TO_KM
  const filtered = flights.filter((f) => haversineKm(lat, lon, f.lat, f.lon) <= distKm)
  return Response.json({ flights: filtered, ...meta }, { headers: cacheHeaders() })
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_R_KM * Math.asin(Math.sqrt(a))
}

function cacheHeaders(): HeadersInit {
  return {
    'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20'
  }
}
