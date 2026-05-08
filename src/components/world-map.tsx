'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import { MOTION_OFFSET, MOTION_TRANSITION } from '../lib/motion'
import type { Locale } from '../lib/types'
import { FlightDetailSheet } from './flight-detail-sheet'

const POLL_INTERVAL = 12_000
const SCALE_MIN = 90
const SCALE_MAX = 500
const WORLD_OVERSCAN = 1.3
const DEFAULT_USER_SCALE = 500
const TAP_THRESHOLD = 5
const HIT_RADIUS_PX = 14
const LERP_FACTOR = 0.08
const ZOOM_LERP = 0.15
const WHEEL_ZOOM_SENSITIVITY = 0.0025
const PINCH_ZOOM_SENSITIVITY = 0.01
const FRICTION = 0.92

type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied'

function angleLerp(from: number, to: number, t: number): number {
  const diff = ((to - from + 540) % 360) - 180
  return from + diff * t
}

const EXPAND_DURATION = 400

function getMinScaleForViewport(w: number, h: number): number {
  return Math.max(SCALE_MIN, (w / 360) * WORLD_OVERSCAN, (h / 180) * WORLD_OVERSCAN)
}

function clampScaleForViewport(scale: number, w: number, h: number): number {
  return Math.max(getMinScaleForViewport(w, h), Math.min(SCALE_MAX, scale))
}

export function WorldMap({ locale }: { locale: Locale }) {
  const reduceMotion = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(false)
  const [flightCount, setFlightCount] = useState(0)
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'denied'
    return 'idle'
  })
  const [originRect, setOriginRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)
  const cardCanvasRef = useRef<HTMLCanvasElement>(null)
  const fullCanvasRef = useRef<HTMLCanvasElement>(null)
  const geojsonRef = useRef<GeoJSON | null>(null)
  const flightsRef = useRef<Flight[]>([])
  const displayFlightsRef = useRef<Flight[]>([])
  const pollTimeRef = useRef(0)
  const vpRef = useRef<Viewport>({ x: 0, y: 0, scale: 1 })
  const rafRef = useRef(0)
  const userLocationRef = useRef<{ lat: number; lon: number } | null>(null)
  const vpInitializedRef = useRef(false)
  const lockCenterRef = useRef(true)
  const activeCanvasRef = useRef<'card' | 'full'>('card')

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

  const momentumRef = useRef({ vx: 0, vy: 0 })
  const lastDragRef = useRef({ x: 0, y: 0, t: 0 })
  const zoomAnimRef = useRef({ targetScale: 0, cx: 0, cy: 0, active: false })

  /* ---- data fetching ---- */

  useEffect(() => {
    fetch('/world-110m.json')
      .then((r) => r.json())
      .then((data) => {
        geojsonRef.current = data
      })
      .catch(() => {})
  }, [])

  const fetchFlights = useCallback((lat: number, lon: number, force = false) => {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon), dist: '250' })
    if (force) params.set('force', '1')
    fetch(`/api/flights?${params}`)
      .then((r) => r.json())
      .then((data: { flights: Flight[]; time: number }) => {
        flightsRef.current = data.flights
        pollTimeRef.current = Date.now()
        setFlightCount(data.flights.length)
      })
      .catch(() => {})
  }, [])

  const syncFlights = useCallback(() => {
    const loc = userLocationRef.current
    if (loc) fetchFlights(loc.lat, loc.lon, true)
  }, [fetchFlights])

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

  /* ---- geolocation ---- */

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

  /* ---- map controls ---- */

  const recenter = useCallback(() => {
    const canvas = activeCanvasRef.current === 'full' ? fullCanvasRef.current : cardCanvasRef.current
    const loc = userLocationRef.current
    if (!canvas || !loc) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const scale = clampScaleForViewport(DEFAULT_USER_SCALE, rect.width, rect.height)
    vpRef.current = centerViewportOn(loc.lon, loc.lat, scale, rect.width, rect.height)
    zoomAnimRef.current.active = false
  }, [])

  const zoomBy = useCallback((factor: number) => {
    const canvas = fullCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    const base = zoomAnimRef.current.active ? zoomAnimRef.current.targetScale : vpRef.current.scale
    const target = clampScaleForViewport(base * factor, rect.width, rect.height)
    if (target === vpRef.current.scale) {
      zoomAnimRef.current.active = false
      return
    }
    zoomAnimRef.current = { targetScale: target, cx, cy, active: true }
  }, [])

  /* ---- drawing ---- */

  const draw = useCallback(
    (canvas: HTMLCanvasElement, vp: Viewport, interpolate: boolean) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      if (w === 0 || h === 0) return

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const colors = readMapColors(document.documentElement)

      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, w, h)

      if (geojsonRef.current) {
        drawWorldOutline(ctx, geojsonRef.current, vp, colors)
      }

      let targets = flightsRef.current
      if (interpolate && pollTimeRef.current > 0) {
        const dt = (Date.now() - pollTimeRef.current) / 1000
        targets = interpolateFlights(targets, dt)
      }

      const prev = displayFlightsRef.current
      if (reduceMotion || prev.length === 0) {
        displayFlightsRef.current = targets.map((f) => ({ ...f }))
      } else {
        displayFlightsRef.current = targets.map((target) => {
          const old = prev.find((d) => d.icao24 === target.icao24)
          if (!old) return { ...target }
          return {
            ...target,
            lat: old.lat + (target.lat - old.lat) * LERP_FACTOR,
            lon: old.lon + (target.lon - old.lon) * LERP_FACTOR,
            heading: angleLerp(old.heading, target.heading, LERP_FACTOR)
          }
        })
      }
      drawAirplanes(ctx, displayFlightsRef.current, vp, w, h, colors)

      const loc = userLocationRef.current
      if (loc) drawUserLocation(ctx, loc.lon, loc.lat, vp, w, h, colors)
    },
    [reduceMotion]
  )

  useEffect(() => {
    const tick = () => {
      const loc = userLocationRef.current

      /* ---- animated zoom ---- */
      if (zoomAnimRef.current.active) {
        const { targetScale, cx, cy } = zoomAnimRef.current
        const vp = vpRef.current
        const diff = targetScale - vp.scale
        if (Math.abs(diff) / Math.max(targetScale, 1) < 0.002) {
          const ratio = targetScale / vp.scale
          vpRef.current = { x: cx - (cx - vp.x) * ratio, y: cy - (cy - vp.y) * ratio, scale: targetScale }
          zoomAnimRef.current.active = false
        } else {
          const newScale = vp.scale + diff * ZOOM_LERP
          const ratio = newScale / vp.scale
          vpRef.current = { x: cx - (cx - vp.x) * ratio, y: cy - (cy - vp.y) * ratio, scale: newScale }
        }
      }

      /* ---- momentum ---- */
      const m = momentumRef.current
      if (!lockCenterRef.current && pinchRef.current.size === 0 && !dragRef.current.active) {
        if (Math.abs(m.vx) > 0.1 || Math.abs(m.vy) > 0.1) {
          vpRef.current = { ...vpRef.current, x: vpRef.current.x + m.vx, y: vpRef.current.y + m.vy }
          m.vx *= FRICTION
          m.vy *= FRICTION
        } else {
          m.vx = 0
          m.vy = 0
        }
      }

      const primary = activeCanvasRef.current === 'full' ? fullCanvasRef.current : cardCanvasRef.current
      if (primary) {
        const rect = primary.getBoundingClientRect()
        const w = rect.width
        const h = rect.height

        if (locationStatus === 'granted' && !vpInitializedRef.current && loc && w > 0 && h > 0) {
          const scale = clampScaleForViewport(DEFAULT_USER_SCALE, w, h)
          vpRef.current = centerViewportOn(loc.lon, loc.lat, scale, w, h)
          vpInitializedRef.current = true
        }

        if (lockCenterRef.current && loc && w > 0 && h > 0) {
          const scale = clampScaleForViewport(vpRef.current.scale, w, h)
          vpRef.current = centerViewportOn(loc.lon, loc.lat, scale, w, h)
        }

        draw(primary, vpRef.current, !reduceMotion)
      }

      if (activeCanvasRef.current === 'full' && cardCanvasRef.current && loc) {
        const rect = cardCanvasRef.current.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          const scale = clampScaleForViewport(vpRef.current.scale, rect.width, rect.height)
          const cardVp = centerViewportOn(loc.lon, loc.lat, scale, rect.width, rect.height)
          draw(cardCanvasRef.current, cardVp, !reduceMotion)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw, locationStatus, reduceMotion])

  /* ---- pointer handlers (fullscreen only) ---- */

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = fullCanvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)

    zoomAnimRef.current.active = false
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const size = pinchRef.current.size

    momentumRef.current = { vx: 0, vy: 0 }

    if (size === 1) {
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startVpX: vpRef.current.x,
        startVpY: vpRef.current.y,
        moved: 0
      }
      lastDragRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
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
    if (!pinchRef.current.has(e.pointerId)) return
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pinchStateRef.current.active && pinchRef.current.size >= 2) {
      const [p1, p2] = [...pinchRef.current.values()]
      const dx = p1.x - p2.x
      const dy = p1.y - p2.y
      const dist = Math.hypot(dx, dy) || 1
      const cx = (p1.x + p2.x) / 2
      const cy = (p1.y + p2.y) / 2
      const s = pinchStateRef.current
      const canvas = fullCanvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const newScale = clampScaleForViewport(s.startScale * (dist / s.startDist), rect.width, rect.height)
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

      const now = performance.now()
      const dt = now - lastDragRef.current.t
      if (dt > 0 && dt < 100) {
        momentumRef.current.vx = ((e.clientX - lastDragRef.current.x) / dt) * 16
        momentumRef.current.vy = ((e.clientY - lastDragRef.current.y) / dt) * 16
      }
      lastDragRef.current = { x: e.clientX, y: e.clientY, t: now }
    }
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pinchRef.current.delete(e.pointerId)

    if (pinchStateRef.current.active && pinchRef.current.size < 2) {
      pinchStateRef.current.active = false
    }

    if (pinchRef.current.size === 0) {
      if (dragRef.current.active && !multitouchRef.current && dragRef.current.moved < TAP_THRESHOLD) {
        const canvas = fullCanvasRef.current
        if (canvas) {
          const rect = canvas.getBoundingClientRect()
          const sx = e.clientX - rect.left
          const sy = e.clientY - rect.top
          const [lon, lat] = screenToLonLat(sx, sy, vpRef.current)
          const thresholdDeg = HIT_RADIUS_PX / (BASE_PIX_PER_DEG * vpRef.current.scale)
          const hit = findFlightAt(displayFlightsRef.current, lon, lat, thresholdDeg)
          if (hit) setSelectedFlight(hit)
        }
        momentumRef.current = { vx: 0, vy: 0 }
      } else if (dragRef.current.active) {
        const timeSinceLastMove = performance.now() - lastDragRef.current.t
        if (timeSinceLastMove > 80) {
          momentumRef.current = { vx: 0, vy: 0 }
        }
      }
      dragRef.current.active = false
      multitouchRef.current = false
    }
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (dragRef.current.active || pinchStateRef.current.active) return
    const canvas = fullCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const sensitivity = e.ctrlKey ? PINCH_ZOOM_SENSITIVITY : WHEEL_ZOOM_SENSITIVITY
    const factor = Math.max(0.88, Math.min(1.12, Math.exp(-e.deltaY * sensitivity)))
    const base = zoomAnimRef.current.active ? zoomAnimRef.current.targetScale : vpRef.current.scale
    const target = clampScaleForViewport(base * factor, rect.width, rect.height)
    if (target === vpRef.current.scale) {
      zoomAnimRef.current.active = false
      return
    }
    zoomAnimRef.current = { targetScale: target, cx: mx, cy: my, active: true }
  }, [])

  /* ---- expand / collapse ---- */

  const overlayRef = useRef<HTMLDivElement>(null)
  const collapsingRef = useRef(false)

  function handleExpand() {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    setOriginRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    lockCenterRef.current = true
    activeCanvasRef.current = 'full'
    momentumRef.current = { vx: 0, vy: 0 }
    zoomAnimRef.current.active = false
    collapsingRef.current = false
    setControlsVisible(false)
    setExpanded(true)
  }

  useEffect(() => {
    if (!expanded || !originRect) return
    const el = overlayRef.current
    if (!el) return
    const expandTid = setTimeout(() => {
      el.style.top = '0px'
      el.style.left = '0px'
      el.style.width = '100vw'
      el.style.height = '100vh'
      el.style.borderRadius = '0px'
    }, 0)
    const controlsTid = setTimeout(() => {
      setControlsVisible(true)
    }, reduceMotion ? 0 : 120)
    const unlockTid = setTimeout(() => {
      lockCenterRef.current = false
    }, reduceMotion ? 0 : EXPAND_DURATION)
    return () => {
      clearTimeout(expandTid)
      clearTimeout(controlsTid)
      clearTimeout(unlockTid)
    }
  }, [expanded, originRect, reduceMotion])

  const handleCollapse = useCallback(() => {
    lockCenterRef.current = true
    momentumRef.current = { vx: 0, vy: 0 }
    zoomAnimRef.current.active = false
    setSelectedFlight(null)
    setControlsVisible(false)

    const el = overlayRef.current
    const card = cardRef.current
    if (el && card) {
      const rect = card.getBoundingClientRect()
      el.style.top = `${rect.top}px`
      el.style.left = `${rect.left}px`
      el.style.width = `${rect.width}px`
      el.style.height = `${rect.height}px`
      el.style.borderRadius = '12px'
      collapsingRef.current = true
      setTimeout(() => {
        collapsingRef.current = false
        activeCanvasRef.current = 'card'
        setExpanded(false)
      }, reduceMotion ? 0 : EXPAND_DURATION)
    } else {
      activeCanvasRef.current = 'card'
      setExpanded(false)
    }
  }, [reduceMotion])

  useEffect(() => {
    if (!expanded || selectedFlight) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCollapse()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, selectedFlight, handleCollapse])

  const granted = locationStatus === 'granted'
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <>
      {/* Card preview — fills remaining space */}
      <div
        data-disable-app-noise
        className='flex min-h-0 flex-1 flex-col px-5 py-3'
      >
        <div
          ref={cardRef}
          onClick={granted ? handleExpand : undefined}
          className={`relative min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-bg shadow-lg transition-shadow duration-200 ${granted ? 'cursor-pointer hover:shadow-xl' : ''} ${expanded ? 'invisible' : ''}`}
        >
          {!expanded && <canvas ref={cardCanvasRef} className='absolute inset-0 h-full w-full' />}

          {granted && !expanded && (
            <div className='pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3'>
              {flightCount > 0 && (
                <span className='text-ink-faint text-xs'>
                  {flightCount.toLocaleString()} {t(locale, 'world.map.planes')}
                </span>
              )}
              <span className='text-ink-faint font-display ml-auto text-xs'>{t(locale, 'world.map.explore')}</span>
            </div>
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
        </div>
      </div>

      {/* Fullscreen expanded view */}
      {typeof document !== 'undefined' &&
        expanded &&
        originRect &&
        createPortal(
          <div
            ref={overlayRef}
            className='bg-bg'
            style={{
              position: 'fixed',
              zIndex: 50,
              overflow: 'hidden',
              transition: reduceMotion ? 'none' : `top ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1), left ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1), width ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1), height ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1), border-radius ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1)`,
              top: originRect.top,
              left: originRect.left,
              width: originRect.width,
              height: originRect.height,
              borderRadius: 12
            }}
          >
                <canvas
                  ref={fullCanvasRef}
                  className='absolute inset-0 h-full w-full touch-none'
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onWheel={onWheel}
                />

                {/* Floating controls — constrained to container width */}
                <div className='pointer-events-none absolute inset-0 z-10 mx-auto flex max-w-[630px] flex-col'>
                  <AnimatePresence>
                    {controlsVisible && (
                      <motion.div
                        key='map-close'
                        initial={reduceMotion ? false : { opacity: 0, y: -MOTION_OFFSET.token, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -MOTION_OFFSET.token, scale: 0.96 }}
                        transition={MOTION_TRANSITION.inline}
                        className='pointer-events-auto pt-[max(env(safe-area-inset-top),1rem)] pl-4'
                      >
                        <MapButton
                          onClick={handleCollapse}
                          aria-label={t(locale, 'world.map.close')}
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
                            <line
                              x1='19'
                              y1='12'
                              x2='5'
                              y2='12'
                            />
                            <polyline points='12 19 5 12 12 5' />
                          </svg>
                        </MapButton>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className='flex-1' />

                  <AnimatePresence>
                    {controlsVisible && (
                      <motion.div
                        key='map-controls'
                        initial={reduceMotion ? false : { opacity: 0, y: MOTION_OFFSET.token, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: MOTION_OFFSET.token, scale: 0.98 }}
                        transition={MOTION_TRANSITION.inline}
                        className='pointer-events-auto flex items-end justify-between px-4 pb-[max(env(safe-area-inset-bottom),1rem)]'
                      >
                        {flightCount > 0 ?
                          <span className='text-ink-faint text-xs'>
                            {flightCount.toLocaleString()} {t(locale, 'world.map.planes')}
                          </span>
                        : <span />}

                        <div className='flex flex-col gap-2'>
                          <MapButton
                            onClick={() => zoomBy(1.5)}
                            aria-label={t(locale, 'world.map.zoomIn')}
                          >
                            <svg
                              width='18'
                              height='18'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                              strokeLinecap='round'
                            >
                              <line
                                x1='12'
                                y1='5'
                                x2='12'
                                y2='19'
                              />
                              <line
                                x1='5'
                                y1='12'
                                x2='19'
                                y2='12'
                              />
                            </svg>
                          </MapButton>
                          <MapButton
                            onClick={() => zoomBy(1 / 1.5)}
                            aria-label={t(locale, 'world.map.zoomOut')}
                          >
                            <svg
                              width='18'
                              height='18'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                              strokeLinecap='round'
                            >
                              <line
                                x1='5'
                                y1='12'
                                x2='19'
                                y2='12'
                              />
                            </svg>
                          </MapButton>
                          <MapButton
                            onClick={recenter}
                            aria-label={t(locale, 'world.map.recenter')}
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
                          </MapButton>
                          {isDev && (
                            <MapButton
                              onClick={syncFlights}
                              aria-label='Sync flights'
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
                                <path d='M21 2v6h-6' />
                                <path d='M3 12a9 9 0 0 1 15-6.7L21 8' />
                                <path d='M3 22v-6h6' />
                                <path d='M21 12a9 9 0 0 1-15 6.7L3 16' />
                              </svg>
                            </MapButton>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <FlightDetailSheet
                  flight={selectedFlight}
                  onClose={() => setSelectedFlight(null)}
                  locale={locale}
                />
          </div>,
          document.body
        )}
    </>
  )
}

function MapButton({ onClick, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='border-line bg-paper/90 text-ink flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm active:scale-95'
      {...props}
    >
      {children}
    </button>
  )
}
