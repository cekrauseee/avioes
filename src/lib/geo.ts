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
  mapBg: string
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

export type PlaneEffectState = {
  hover: number
  selected: number
}

const PLANE_SIZE = 8
const PLANE_HOVER_EXTRA = 4
const PLANE_SELECTED_EXTRA = 2.5
const PLANE_EFFECT_LERP = 0.18

export function drawAirplanes(
  ctx: CanvasRenderingContext2D,
  flights: Flight[],
  vp: Viewport,
  w: number,
  h: number,
  colors: MapColors,
  options: {
    hoveredIcao24?: string | null
    selectedIcao24?: string | null
    effects?: Map<string, PlaneEffectState>
    immediate?: boolean
  } = {}
) {
  const ppd = BASE_PIX_PER_DEG * vp.scale
  const vpx = vp.x
  const vpy = vp.y
  const activeFlights: { flight: Flight; hover: number; selected: number }[] = []

  function drawPlanePath(size: number) {
    ctx.beginPath()
    ctx.moveTo(0, -size * 1.18)
    ctx.lineTo(size * 0.3, -size * 0.16)
    ctx.lineTo(size * 1.08, size * 0.16)
    ctx.lineTo(size * 1.12, size * 0.48)
    ctx.lineTo(size * 0.24, size * 0.34)
    ctx.lineTo(size * 0.16, size * 0.9)
    ctx.lineTo(size * 0.5, size * 1.1)
    ctx.lineTo(0, size * 0.92)
    ctx.lineTo(-size * 0.5, size * 1.1)
    ctx.lineTo(-size * 0.16, size * 0.9)
    ctx.lineTo(-size * 0.24, size * 0.34)
    ctx.lineTo(-size * 1.12, size * 0.48)
    ctx.lineTo(-size * 1.08, size * 0.16)
    ctx.lineTo(-size * 0.3, -size * 0.16)
    ctx.closePath()
  }

  function drawPlane(f: Flight, hover: number, selected: number) {
    const sx = (f.lon + 180) * ppd + vpx
    const sy = (90 - f.lat) * ppd + vpy
    if (sx < -32 || sx > w + 32 || sy < -32 || sy > h + 32) return

    const size = PLANE_SIZE + Math.max(hover * PLANE_HOVER_EXTRA, selected * PLANE_SELECTED_EXTRA)
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(((f.heading || 0) * Math.PI) / 180)
    ctx.lineJoin = 'round'
    if (selected > 0.01) {
      ctx.globalAlpha = 0.18 * selected
      ctx.strokeStyle = colors.sage
      ctx.lineWidth = 5
      drawPlanePath(size + 1.6)
      ctx.stroke()

      ctx.globalAlpha = 0.8 * selected
      ctx.strokeStyle = colors.paper
      ctx.lineWidth = 2
      drawPlanePath(size + 1.2)
      ctx.stroke()

      ctx.globalAlpha = 1
    }

    ctx.fillStyle = colors.sage
    ctx.strokeStyle = colors.ink
    ctx.lineWidth = 0.6 + Math.max(hover, selected) * 0.35
    if (hover > 0.01) {
      ctx.shadowColor = colors.ink
      ctx.shadowBlur = 7 * hover
      ctx.shadowOffsetY = 2
    }

    drawPlanePath(size)
    ctx.fill()
    ctx.stroke()

    ctx.restore()
  }

  for (let i = 0; i < flights.length; i++) {
    const f = flights[i]
    const targetHover = f.icao24 === options.hoveredIcao24 ? 1 : 0
    const targetSelected = f.icao24 === options.selectedIcao24 ? 1 : 0
    let hover = targetHover
    let selected = targetSelected

    if (options.effects) {
      const prev = options.effects.get(f.icao24) ?? { hover: 0, selected: 0 }
      hover = options.immediate ? targetHover : prev.hover + (targetHover - prev.hover) * PLANE_EFFECT_LERP
      selected = options.immediate ? targetSelected : prev.selected + (targetSelected - prev.selected) * PLANE_EFFECT_LERP

      if (hover < 0.01 && selected < 0.01 && targetHover === 0 && targetSelected === 0) {
        options.effects.delete(f.icao24)
      } else {
        options.effects.set(f.icao24, { hover, selected })
      }
    }

    if (hover > 0.01 || selected > 0.01) {
      activeFlights.push({ flight: f, hover, selected })
      continue
    }
    drawPlane(f, 0, 0)
  }

  for (const item of activeFlights) {
    drawPlane(item.flight, item.hover, item.selected)
  }
}

export function readMapColors(el: HTMLElement): MapColors {
  const s = getComputedStyle(el)
  return {
    bg: s.getPropertyValue('--bg').trim(),
    mapBg: s.getPropertyValue('--map-bg').trim(),
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
