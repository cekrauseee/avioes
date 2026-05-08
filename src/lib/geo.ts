export type Viewport = { x: number; y: number; scale: number }

export type Flight = {
  icao24: string
  callsign: string
  originCountry: string
  lat: number
  lon: number
  heading: number
  velocity: number
  altitude: number
  verticalRate: number
  onGround: boolean
}

export type MapColors = {
  bg: string
  ink: string
  inkFaint: string
  line: string
  sage: string
  paper: string
}

type GeoJSONGeometry = {
  type: string
  coordinates: number[][][] | number[][][][]
}

type GeoJSONFeature = {
  type: string
  geometry: GeoJSONGeometry
}

export type GeoJSON = {
  type: string
  features: GeoJSONFeature[]
}

const DEG_TO_RAD = Math.PI / 180
const EARTH_RADIUS_M = 6_371_000

export const BASE_PIX_PER_DEG = 1

export function projectLonLat(lon: number, lat: number, vp: Viewport): [number, number] {
  const ppd = BASE_PIX_PER_DEG * vp.scale
  const sx = (lon + 180) * ppd + vp.x
  const sy = (90 - lat) * ppd + vp.y
  return [sx, sy]
}

export function screenToLonLat(sx: number, sy: number, vp: Viewport): [number, number] {
  const ppd = BASE_PIX_PER_DEG * vp.scale
  const lon = (sx - vp.x) / ppd - 180
  const lat = 90 - (sy - vp.y) / ppd
  return [lon, lat]
}

function drawRing(ctx: CanvasRenderingContext2D, ring: number[][], vp: Viewport) {
  if (ring.length === 0) return
  const [x0, y0] = projectLonLat(ring[0][0], ring[0][1], vp)
  ctx.moveTo(x0, y0)
  for (let i = 1; i < ring.length; i++) {
    const [x, y] = projectLonLat(ring[i][0], ring[i][1], vp)
    ctx.lineTo(x, y)
  }
  ctx.closePath()
}

export function drawWorldOutline(ctx: CanvasRenderingContext2D, geojson: GeoJSON, vp: Viewport, colors: MapColors) {
  ctx.fillStyle = colors.paper
  ctx.strokeStyle = colors.line
  ctx.lineWidth = 0.5

  for (const feature of geojson.features) {
    const { type, coordinates } = feature.geometry
    ctx.beginPath()

    if (type === 'Polygon') {
      for (const ring of coordinates as number[][][]) {
        drawRing(ctx, ring, vp)
      }
    } else if (type === 'MultiPolygon') {
      for (const polygon of coordinates as number[][][][]) {
        for (const ring of polygon) {
          drawRing(ctx, ring, vp)
        }
      }
    }

    ctx.fill()
    ctx.stroke()
  }
}

const PLANE_SIZE = 6

export function drawAirplanes(ctx: CanvasRenderingContext2D, flights: Flight[], vp: Viewport, w: number, h: number, colors: MapColors) {
  ctx.fillStyle = colors.sage
  ctx.strokeStyle = colors.ink
  ctx.lineWidth = 0.5

  for (const f of flights) {
    const [sx, sy] = projectLonLat(f.lon, f.lat, vp)
    if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue

    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(((f.heading || 0) * Math.PI) / 180)

    ctx.beginPath()
    ctx.moveTo(0, -PLANE_SIZE)
    ctx.lineTo(-PLANE_SIZE * 0.35, PLANE_SIZE * 0.6)
    ctx.lineTo(PLANE_SIZE * 0.35, PLANE_SIZE * 0.6)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.restore()
  }
}

export function readMapColors(el: HTMLElement): MapColors {
  const s = getComputedStyle(el)
  return {
    bg: s.getPropertyValue('--bg').trim(),
    ink: s.getPropertyValue('--ink').trim(),
    inkFaint: s.getPropertyValue('--ink-faint').trim(),
    line: s.getPropertyValue('--line').trim(),
    sage: s.getPropertyValue('--sage').trim(),
    paper: s.getPropertyValue('--paper').trim()
  }
}

export function interpolateFlights(flights: Flight[], dtSeconds: number): Flight[] {
  if (dtSeconds <= 0) return flights
  return flights.map((f) => {
    if (!f.velocity || f.velocity <= 0) return f
    const headingRad = (f.heading || 0) * DEG_TO_RAD
    const distM = f.velocity * dtSeconds
    const dLat = ((distM * Math.cos(headingRad)) / EARTH_RADIUS_M) * (180 / Math.PI)
    const dLon = ((distM * Math.sin(headingRad)) / (EARTH_RADIUS_M * Math.cos(f.lat * DEG_TO_RAD))) * (180 / Math.PI)
    return { ...f, lon: f.lon + dLon, lat: f.lat + dLat }
  })
}

export function centerViewportOn(lon: number, lat: number, scale: number, w: number, h: number): Viewport {
  const ppd = BASE_PIX_PER_DEG * scale
  const sx = (lon + 180) * ppd
  const sy = (90 - lat) * ppd
  return { x: w / 2 - sx, y: h / 2 - sy, scale }
}

export function drawUserLocation(ctx: CanvasRenderingContext2D, lon: number, lat: number, vp: Viewport, w: number, h: number, colors: MapColors) {
  const [sx, sy] = projectLonLat(lon, lat, vp)
  if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) return

  ctx.save()
  ctx.fillStyle = colors.sage
  ctx.globalAlpha = 0.22
  ctx.beginPath()
  ctx.arc(sx, sy, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.fillStyle = colors.sage
  ctx.strokeStyle = colors.bg
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(sx, sy, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

export function findFlightAt(flights: Flight[], lon: number, lat: number, threshold: number): Flight | null {
  let best: Flight | null = null
  let bestDist = threshold * threshold
  for (const f of flights) {
    const dLon = f.lon - lon
    const dLat = f.lat - lat
    const d = dLon * dLon + dLat * dLat
    if (d < bestDist) {
      bestDist = d
      best = f
    }
  }
  return best
}
