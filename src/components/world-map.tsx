'use client'

import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BASE_PIX_PER_DEG,
  centerViewportOn,
  drawAirplanes,
  drawUserLocation,
  drawWorldOutline,
  findFlightAt,
  interpolateFlights,
  readMapColors,
  screenToLonLat,
  type Flight,
  type GeoJSON,
  type Viewport
} from '../lib/geo'
import { t } from '../lib/i18n'
import type { Locale } from '../lib/types'
import { FlightDetailSheet } from './flight-detail-sheet'

const POLL_INTERVAL = 12_000
const SCALE_MIN = 5
const SCALE_MAX = 20_000
const DEFAULT_USER_SCALE = 500
const TAP_THRESHOLD = 5
const HIT_RADIUS_PX = 14

type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied'

export function WorldMap({ locale }: { locale: Locale }) {
  const reduceMotion = useReducedMotion()
  const [flightCount, setFlightCount] = useState(0)
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'denied'
    return 'idle'
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const geojsonRef = useRef<GeoJSON | null>(null)
  const flightsRef = useRef<Flight[]>([])
  const pollTimeRef = useRef(0)
  const vpRef = useRef<Viewport>({ x: 0, y: 0, scale: 1 })
  const rafRef = useRef(0)
  const userLocationRef = useRef<{ lat: number; lon: number } | null>(null)
  const vpInitializedRef = useRef(false)

  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startVpX: 0,
    startVpY: 0,
    moved: 0
  })

  const pinchRef = useRef<Map<number, { x: number; y: number }>>(new Map())

  const pinchStateRef = useRef({
    active: false,
    startDist: 0,
    startCx: 0,
    startCy: 0,
    startScale: 1,
    startVpX: 0,
    startVpY: 0
  })

  const multitouchRef = useRef(false)

  useEffect(() => {
    fetch('/world-110m.json')
      .then((r) => r.json())
      .then((data) => {
        geojsonRef.current = data
      })
      .catch(() => {})
  }, [])

  const fetchFlights = useCallback((lat: number, lon: number) => {
    fetch(`/api/flights?lat=${lat}&lon=${lon}&dist=250`)
      .then((r) => r.json())
      .then((data: { flights: Flight[]; time: number }) => {
        flightsRef.current = data.flights
        pollTimeRef.current = Date.now()
        setFlightCount(data.flights.length)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (locationStatus !== 'granted') return
    const run = () => {
      const loc = userLocationRef.current
      if (loc) fetchFlights(loc.lat, loc.lon)
    }
    run()
    const id = setInterval(run, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [locationStatus, fetchFlights])

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setLocationStatus('denied')
      return
    }
    setLocationStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocationRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        vpInitializedRef.current = false
        setLocationStatus('granted')
      },
      () => {
        setLocationStatus('denied')
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    )
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return
    if (!('permissions' in navigator)) {
      Promise.resolve().then(() => requestLocation())
      return
    }
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((res) => {
        if (res.state === 'granted') requestLocation()
        else if (res.state === 'denied') setLocationStatus('denied')
      })
      .catch(() => {})
  }, [requestLocation])

  const recenter = useCallback(() => {
    const canvas = canvasRef.current
    const loc = userLocationRef.current
    if (!canvas || !loc) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    vpRef.current = centerViewportOn(loc.lon, loc.lat, DEFAULT_USER_SCALE, rect.width, rect.height)
  }, [])

  const draw = useCallback((canvas: HTMLCanvasElement, vp: Viewport, interpolate: boolean) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const el = (canvas.closest('[data-palette]') as HTMLElement) || document.documentElement
    const colors = readMapColors(el)

    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, w, h)

    if (geojsonRef.current) {
      drawWorldOutline(ctx, geojsonRef.current, vp, colors)
    }

    let flights = flightsRef.current
    if (interpolate && pollTimeRef.current > 0) {
      const dt = (Date.now() - pollTimeRef.current) / 1000
      flights = interpolateFlights(flights, dt)
    }
    drawAirplanes(ctx, flights, vp, w, h, colors)

    const loc = userLocationRef.current
    if (loc) {
      drawUserLocation(ctx, loc.lon, loc.lat, vp, w, h, colors)
    }
  }, [])

  useEffect(() => {
    const tick = () => {
      const canvas = canvasRef.current
      if (canvas) {
        if (locationStatus === 'granted' && !vpInitializedRef.current && userLocationRef.current) {
          const rect = canvas.getBoundingClientRect()
          if (rect.width > 0 && rect.height > 0) {
            const loc = userLocationRef.current
            vpRef.current = centerViewportOn(loc.lon, loc.lat, DEFAULT_USER_SCALE, rect.width, rect.height)
            vpInitializedRef.current = true
          }
        }
        draw(canvas, vpRef.current, !reduceMotion)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw, locationStatus, reduceMotion])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)

    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const size = pinchRef.current.size

    if (size === 1) {
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startVpX: vpRef.current.x,
        startVpY: vpRef.current.y,
        moved: 0
      }
    } else if (size === 2) {
      multitouchRef.current = true
      dragRef.current.active = false
      const [p1, p2] = [...pinchRef.current.values()]
      const dx = p1.x - p2.x
      const dy = p1.y - p2.y
      pinchStateRef.current = {
        active: true,
        startDist: Math.hypot(dx, dy) || 1,
        startCx: (p1.x + p2.x) / 2,
        startCy: (p1.y + p2.y) / 2,
        startScale: vpRef.current.scale,
        startVpX: vpRef.current.x,
        startVpY: vpRef.current.y
      }
    }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pinchStateRef.current.active && pinchRef.current.size >= 2) {
      const [p1, p2] = [...pinchRef.current.values()]
      const dx = p1.x - p2.x
      const dy = p1.y - p2.y
      const dist = Math.hypot(dx, dy) || 1
      const cx = (p1.x + p2.x) / 2
      const cy = (p1.y + p2.y) / 2
      const s = pinchStateRef.current
      const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, s.startScale * (dist / s.startDist)))
      const ratio = newScale / s.startScale
      vpRef.current = {
        x: cx - (s.startCx - s.startVpX) * ratio,
        y: cy - (s.startCy - s.startVpY) * ratio,
        scale: newScale
      }
      return
    }

    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      dragRef.current.moved = Math.max(dragRef.current.moved, Math.abs(dx) + Math.abs(dy))
      vpRef.current = {
        ...vpRef.current,
        x: dragRef.current.startVpX + dx,
        y: dragRef.current.startVpY + dy
      }
    }
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      pinchRef.current.delete(e.pointerId)

      if (pinchStateRef.current.active && pinchRef.current.size < 2) {
        pinchStateRef.current.active = false
      }

      if (pinchRef.current.size === 0) {
        if (dragRef.current.active && !multitouchRef.current && dragRef.current.moved < TAP_THRESHOLD) {
          const canvas = canvasRef.current
          if (canvas) {
            const rect = canvas.getBoundingClientRect()
            const sx = e.clientX - rect.left
            const sy = e.clientY - rect.top
            const [lon, lat] = screenToLonLat(sx, sy, vpRef.current)
            let flights = flightsRef.current
            if (!reduceMotion && pollTimeRef.current > 0) {
              const dt = (Date.now() - pollTimeRef.current) / 1000
              flights = interpolateFlights(flights, dt)
            }
            const thresholdDeg = HIT_RADIUS_PX / (BASE_PIX_PER_DEG * vpRef.current.scale)
            const hit = findFlightAt(flights, lon, lat, thresholdDeg)
            if (hit) setSelectedFlight(hit)
          }
        }
        dragRef.current.active = false
        multitouchRef.current = false
      }
    },
    [reduceMotion]
  )

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const factor = e.deltaY < 0 ? 1.1 : 0.9
    const vp = vpRef.current
    const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, vp.scale * factor))
    const ratio = newScale / vp.scale

    vpRef.current = {
      x: mx - (mx - vp.x) * ratio,
      y: my - (my - vp.y) * ratio,
      scale: newScale
    }
  }, [])

  const granted = locationStatus === 'granted'

  return (
    <div className='relative min-h-0 flex-1 overflow-hidden'>
      <canvas
        ref={canvasRef}
        className='absolute inset-0 h-full w-full touch-none'
        onPointerDown={granted ? onPointerDown : undefined}
        onPointerMove={granted ? onPointerMove : undefined}
        onPointerUp={granted ? onPointerUp : undefined}
        onPointerCancel={granted ? onPointerUp : undefined}
        onWheel={granted ? onWheel : undefined}
      />

      {granted && flightCount > 0 && (
        <div className='text-ink-faint pointer-events-none absolute bottom-[max(env(safe-area-inset-bottom),1rem)] left-4 z-10 text-xs'>
          {flightCount.toLocaleString()} {t(locale, 'world.map.planes')}
        </div>
      )}

      {granted && (
        <button
          type='button'
          onClick={recenter}
          aria-label={t(locale, 'world.map.recenter')}
          className='border-line bg-paper text-ink absolute right-4 bottom-[max(env(safe-area-inset-bottom),1rem)] z-10 flex h-10 w-10 items-center justify-center rounded-full border shadow-sm active:scale-95'
        >
          <svg
            width='18'
            height='18'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <circle
              cx='12'
              cy='12'
              r='3'
            />
            <line
              x1='12'
              y1='2'
              x2='12'
              y2='5'
            />
            <line
              x1='12'
              y1='19'
              x2='12'
              y2='22'
            />
            <line
              x1='2'
              y1='12'
              x2='5'
              y2='12'
            />
            <line
              x1='19'
              y1='12'
              x2='22'
              y2='12'
            />
          </svg>
        </button>
      )}

      {!granted && (
        <div className='bg-bg/85 absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center backdrop-blur-sm'>
          <p className='font-display text-ink max-w-xs text-base leading-snug'>{t(locale, 'world.map.locationCta')}</p>
          {locationStatus === 'denied' ?
            <p className='text-ink-faint mt-3 max-w-xs text-xs'>{t(locale, 'world.map.locationDenied')}</p>
          : <button
              type='button'
              onClick={requestLocation}
              disabled={locationStatus === 'requesting'}
              className='border-line bg-paper text-ink font-display mt-5 rounded-full border px-5 py-2 text-sm transition active:scale-95 disabled:opacity-60'
            >
              {locationStatus === 'requesting' ? t(locale, 'world.map.locating') : t(locale, 'world.map.allowLocation')}
            </button>
          }
        </div>
      )}

      <FlightDetailSheet
        flight={selectedFlight}
        onClose={() => setSelectedFlight(null)}
        locale={locale}
      />
    </div>
  )
}
