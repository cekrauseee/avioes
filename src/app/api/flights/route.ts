import { unstable_cache } from 'next/cache'
import type { Flight } from '../../../lib/geo'

const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'
const STATES_URL = 'https://opensky-network.org/api/states/all'
const CACHE_TTL_S = 90
const NM_TO_KM = 1.852
const EARTH_R_KM = 6371

let tokenCache: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string | null> {
  const id = process.env.OPENSKY_CLIENT_ID
  const secret = process.env.OPENSKY_CLIENT_SECRET
  if (!id || !secret) return null

  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: id,
    client_secret: secret
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store'
  })
  if (!res.ok) return null
  const data = (await res.json()) as { access_token: string; expires_in: number }
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  }
  return tokenCache.token
}

const fetchAllStates = unstable_cache(
  async (): Promise<{ flights: Flight[]; time: number }> => {
    const token = await getAccessToken()
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
  },
  ['opensky-states-all'],
  { revalidate: CACHE_TTL_S, tags: ['opensky'] }
)

export async function GET(req: Request) {
  const url = new URL(req.url)
  const lat = parseFloat(url.searchParams.get('lat') ?? '')
  const lon = parseFloat(url.searchParams.get('lon') ?? '')
  const distRaw = parseFloat(url.searchParams.get('dist') ?? '')
  const distNm = Number.isFinite(distRaw) && distRaw > 0 ? Math.min(distRaw, 1000) : 250

  const { flights, time } = await fetchAllStates()

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ flights, time }, { headers: cacheHeaders() })
  }

  const distKm = distNm * NM_TO_KM
  const filtered = flights.filter((f) => haversineKm(lat, lon, f.lat, f.lon) <= distKm)
  return Response.json({ flights: filtered, time }, { headers: cacheHeaders() })
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
