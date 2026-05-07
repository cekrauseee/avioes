import type { Flight } from '../../../lib/geo'

const OPENSKY_URL = 'https://opensky-network.org/api/states/all'

export async function GET() {
  try {
    const res = await fetch(OPENSKY_URL, { next: { revalidate: 0 } })
    if (!res.ok) {
      return Response.json(
        { flights: [], time: Date.now() },
        { headers: cacheHeaders() }
      )
    }

    const data = await res.json()
    const states: unknown[][] = data.states ?? []
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

    return Response.json(
      { flights, time: data.time ? data.time * 1000 : Date.now() },
      { headers: cacheHeaders() }
    )
  } catch {
    return Response.json(
      { flights: [], time: Date.now() },
      { headers: cacheHeaders() }
    )
  }
}

function cacheHeaders(): HeadersInit {
  return {
    'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=5'
  }
}
