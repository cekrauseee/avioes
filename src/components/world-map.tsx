'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Image from 'next/image'
import { Component, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BASE_PIX_PER_DEG,
  centerViewportOn,
  drawAirplanes,
  drawUserLocation,
  drawWorldOutline,
  findFlightAt,
  readMapColors,
  screenToLonLat,
  type Flight,
  type GeoJSON,
  type PlaneEffectState,
  type Viewport
} from '../lib/geo'
import { t } from '../lib/i18n'
import { MOTION_OFFSET, MOTION_TRANSITION, withMotionDelay } from '../lib/motion'
import { setRouteGestureLock } from '../lib/route-gesture-lock'
import type { Locale } from '../lib/types'
import { Button, usePromiseStatus } from './button'
import { FlightDetailSheet } from './flight-detail-sheet'

const POLL_INTERVAL = 12_000
const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI
const EARTH_R = 6_371_000
const SCALE_MIN = 90
const SCALE_MAX = 500
const WORLD_OVERSCAN = 1.3
const DEFAULT_USER_SCALE = 500
const TAP_THRESHOLD = 5
const HIT_RADIUS_PX = 18
const HOVER_RADIUS_PX = 20
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

// Snapshot written on every render so the error boundary can read it synchronously.
let _preErrorExpanded = false
let _preErrorOriginRect: { top: number; left: number; width: number; height: number } | null = null

function WorldMapImpl({ locale }: { locale: Locale }) {
  const reduceMotion = useReducedMotion()
  const reduceMotionRef = useRef(reduceMotion)
  useEffect(() => {
    reduceMotionRef.current = reduceMotion
  }, [reduceMotion])
  const [expanded, setExpanded] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(false)
  const [mapCursor, setMapCursor] = useState<'grab' | 'grabbing' | 'pointer'>('grab')
  const [flightCount, setFlightCount] = useState(0)
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const locationStatusRef = useRef<LocationStatus>('idle')
  const [originRect, setOriginRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  _preErrorExpanded = expanded
  _preErrorOriginRect = originRect
  const [firstPollDone, setFirstPollDone] = useState(false)
  const [collapsing, setCollapsing] = useState(false)
  const firstPollDoneRef = useRef(false)

  useEffect(() => {
    setRouteGestureLock('world-map-fullscreen', expanded)
    return () => setRouteGestureLock('world-map-fullscreen', false)
  }, [expanded])

  const cardRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const cardCanvasRef = useRef<HTMLCanvasElement>(null)
  const fullCanvasRef = useRef<HTMLCanvasElement>(null)
  const geojsonRef = useRef<GeoJSON | null>(null)
  const flightsRef = useRef<Flight[]>([])
  const displayFlightsRef = useRef<Flight[]>([])
  const lastRawRef = useRef<Flight[]>([])
  const cacheMetaRef = useRef<{ cached: boolean; cachedAt: number; ttl: number } | null>(null)
  const pollTimeRef = useRef(0)
  const vpRef = useRef<Viewport>({ x: 0, y: 0, scale: 1 })
  const rafRef = useRef(0)
  const userLocationRef = useRef<{ lat: number; lon: number } | null>(null)
  const vpInitializedRef = useRef(false)
  const lockCenterRef = useRef(true)
  const activeCanvasRef = useRef<'card' | 'full'>('card')
  const collapsingRef = useRef(false)

  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startVpX: 0,
    startVpY: 0,
    moved: 0
  })
  const pinchRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const hoveredFlightIdRef = useRef<string | null>(null)
  const selectedFlightIdRef = useRef<string | null>(null)
  const planeEffectsRef = useRef<Map<string, PlaneEffectState>>(new Map())
  const mapCursorRef = useRef<'grab' | 'grabbing' | 'pointer'>('grab')
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
  const flyToRef = useRef({ x: 0, y: 0, scale: 1, active: false })

  useEffect(() => {
    selectedFlightIdRef.current = selectedFlight?.icao24 ?? null
  }, [selectedFlight])

  const setCanvasCursor = useCallback((cursor: 'grab' | 'grabbing' | 'pointer') => {
    if (mapCursorRef.current === cursor) return
    mapCursorRef.current = cursor
    setMapCursor(cursor)
  }, [])

  /* ---- data fetching ---- */

  useEffect(() => {
    fetch('/world-110m.json')
      .then((r) => r.json())
      .then((data) => {
        geojsonRef.current = data
      })
      .catch(() => {})
  }, [])

  const fetchFlights = useCallback((force = false) => {
    const url = force ? '/api/flights?force=1' : '/api/flights'
    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json() as Promise<{ flights: Flight[]; time: number; cached: boolean; cachedAt: number; ttl: number }>
      })
      .then((data) => {
        flightsRef.current = data.flights
        pollTimeRef.current = Date.now()
        cacheMetaRef.current = { cached: data.cached, cachedAt: data.cachedAt, ttl: data.ttl }
        setFlightCount((prev) => (prev === data.flights.length ? prev : data.flights.length))
        if (!firstPollDoneRef.current) {
          firstPollDoneRef.current = true
          setFirstPollDone(true)
        }
      })
  }, [])

  const syncFlights = useCallback(() => fetchFlights(true), [fetchFlights])

  useEffect(() => {
    fetchFlights().catch(() => {})
    const id = setInterval(() => {
      fetchFlights().catch(() => {})
    }, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchFlights])

  /* ---- geolocation ---- */

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      locationStatusRef.current = 'denied'
      return
    }
    locationStatusRef.current = 'requesting'
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocationRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        vpInitializedRef.current = false
        locationStatusRef.current = 'granted'
      },
      () => {
        locationStatusRef.current = 'denied'
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    )
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      locationStatusRef.current = 'denied'
      return
    }
    if (!('permissions' in navigator)) {
      Promise.resolve().then(() => requestLocation())
      return
    }
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((res) => {
        if (res.state === 'granted') requestLocation()
        else if (res.state === 'denied') locationStatusRef.current = 'denied'
      })
      .catch(() => {})
  }, [requestLocation])

  /* ---- map controls ---- */

  const recenter = useCallback(() => {
    const canvas = activeCanvasRef.current === 'full' ? fullCanvasRef.current : cardCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const loc = userLocationRef.current
    const center = loc ?? { lon: 0, lat: 30 }
    const scale = clampScaleForViewport(DEFAULT_USER_SCALE, rect.width, rect.height)
    const target = centerViewportOn(center.lon, center.lat, scale, rect.width, rect.height)
    flyToRef.current = { x: target.x, y: target.y, scale: target.scale, active: true }
    zoomAnimRef.current.active = false
    momentumRef.current = { vx: 0, vy: 0 }
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

  const draw = useCallback((canvas: HTMLCanvasElement, vp: Viewport) => {
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

    ctx.fillStyle = colors.mapBg
    ctx.fillRect(0, 0, w, h)

    if (geojsonRef.current) {
      drawWorldOutline(ctx, geojsonRef.current, vp, colors)
    }

    drawAirplanes(ctx, displayFlightsRef.current, vp, w, h, colors, {
      hoveredIcao24: hoveredFlightIdRef.current,
      selectedIcao24: selectedFlightIdRef.current,
      effects: planeEffectsRef.current,
      immediate: Boolean(reduceMotionRef.current)
    })

    const loc = userLocationRef.current
    if (loc) drawUserLocation(ctx, loc.lon, loc.lat, vp, w, h, colors)
  }, [])

  useEffect(() => {
    const tick = () => {
      const loc = userLocationRef.current
      const rm = reduceMotionRef.current

      /* ---- update display flights (single pass, O(1) lookup) ---- */
      const raw = flightsRef.current
      const display = displayFlightsRef.current
      if (raw.length > 0) {
        const dt = !rm && pollTimeRef.current > 0 ? (Date.now() - pollTimeRef.current) / 1000 : 0

        if (raw !== lastRawRef.current) {
          const prevMap = new Map<string, Flight>()
          for (const d of display) prevMap.set(d.icao24, d)

          display.length = raw.length
          for (let i = 0; i < raw.length; i++) {
            const f = raw[i]
            let tLat = f.lat
            let tLon = f.lon
            if (dt > 0 && f.velocity > 0) {
              const hRad = (f.heading || 0) * DEG_TO_RAD
              const dist = f.velocity * dt
              tLat += ((dist * Math.cos(hRad)) / EARTH_R) * RAD_TO_DEG
              tLon += ((dist * Math.sin(hRad)) / (EARTH_R * Math.cos(f.lat * DEG_TO_RAD))) * RAD_TO_DEG
            }
            const old = prevMap.get(f.icao24)
            if (old && !rm) {
              display[i] = {
                ...f,
                lat: old.lat + (tLat - old.lat) * LERP_FACTOR,
                lon: old.lon + (tLon - old.lon) * LERP_FACTOR,
                heading: angleLerp(old.heading, f.heading, LERP_FACTOR)
              }
            } else {
              display[i] = { ...f, lat: tLat, lon: tLon }
            }
          }
          lastRawRef.current = raw
        } else {
          for (let i = 0; i < raw.length; i++) {
            const f = raw[i]
            let tLat = f.lat
            let tLon = f.lon
            if (dt > 0 && f.velocity > 0) {
              const hRad = (f.heading || 0) * DEG_TO_RAD
              const dist = f.velocity * dt
              tLat += ((dist * Math.cos(hRad)) / EARTH_R) * RAD_TO_DEG
              tLon += ((dist * Math.sin(hRad)) / (EARTH_R * Math.cos(f.lat * DEG_TO_RAD))) * RAD_TO_DEG
            }
            const d = display[i]
            if (d && !rm) {
              d.lat += (tLat - d.lat) * LERP_FACTOR
              d.lon += (tLon - d.lon) * LERP_FACTOR
              d.heading = angleLerp(d.heading, f.heading, LERP_FACTOR)
            } else if (d) {
              d.lat = tLat
              d.lon = tLon
              d.heading = f.heading
            }
          }
        }
      } else if (display.length > 0) {
        display.length = 0
      }

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

      /* ---- fly-to (recenter) ---- */
      if (flyToRef.current.active) {
        const ft = flyToRef.current
        const vp = vpRef.current
        const dx = ft.x - vp.x
        const dy = ft.y - vp.y
        const ds = ft.scale - vp.scale
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(ds) / Math.max(ft.scale, 1) < 0.002) {
          vpRef.current = { x: ft.x, y: ft.y, scale: ft.scale }
          flyToRef.current.active = false
        } else {
          const t = 0.1
          vpRef.current = { x: vp.x + dx * t, y: vp.y + dy * t, scale: vp.scale + ds * t }
        }
      }

      /* ---- momentum ---- */
      const m = momentumRef.current
      if (!flyToRef.current.active && !lockCenterRef.current && pinchRef.current.size === 0 && !dragRef.current.active) {
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

        if (!vpInitializedRef.current && w > 0 && h > 0) {
          const center = loc ?? { lon: 0, lat: 30 }
          const scale = clampScaleForViewport(DEFAULT_USER_SCALE, w, h)
          vpRef.current = centerViewportOn(center.lon, center.lat, scale, w, h)
          vpInitializedRef.current = true
        }

        if (lockCenterRef.current && loc && w > 0 && h > 0) {
          const scale = clampScaleForViewport(vpRef.current.scale, w, h)
          vpRef.current = centerViewportOn(loc.lon, loc.lat, scale, w, h)
        }

        if (w > 0 && h > 0 && !lockCenterRef.current) {
          const vp = vpRef.current
          const mapW = 360 * vp.scale
          const mapH = 180 * vp.scale
          const cx = w / 2
          const cy = h / 2
          const x = Math.max(cx - mapW, Math.min(cx, vp.x))
          const y = Math.max(cy - mapH, Math.min(cy, vp.y))
          if (x !== vp.x || y !== vp.y) {
            vpRef.current = { ...vp, x, y }
            momentumRef.current.vx = 0
            momentumRef.current.vy = 0
          }
        }

        draw(primary, vpRef.current)
      }

      if (activeCanvasRef.current === 'full' && cardCanvasRef.current) {
        const rect = cardCanvasRef.current.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          const center = loc ?? { lon: 0, lat: 30 }
          const scale = clampScaleForViewport(vpRef.current.scale, rect.width, rect.height)
          const cardVp = centerViewportOn(center.lon, center.lat, scale, rect.width, rect.height)
          draw(cardCanvasRef.current, cardVp)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  /* ---- pointer handlers (fullscreen only) ---- */

  const updateHoveredFlight = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = fullCanvasRef.current
      if (!canvas) {
        hoveredFlightIdRef.current = null
        setCanvasCursor('grab')
        return
      }

      const rect = canvas.getBoundingClientRect()
      const sx = clientX - rect.left
      const sy = clientY - rect.top
      if (sx < 0 || sx > rect.width || sy < 0 || sy > rect.height) {
        hoveredFlightIdRef.current = null
        setCanvasCursor('grab')
        return
      }

      const [lon, lat] = screenToLonLat(sx, sy, vpRef.current)
      const thresholdDeg = HOVER_RADIUS_PX / (BASE_PIX_PER_DEG * vpRef.current.scale)
      const hit = findFlightAt(displayFlightsRef.current, lon, lat, thresholdDeg)
      hoveredFlightIdRef.current = hit?.icao24 ?? null
      setCanvasCursor(hit ? 'pointer' : 'grab')
    },
    [setCanvasCursor]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      const canvas = fullCanvasRef.current
      if (!canvas) return
      canvas.setPointerCapture(e.pointerId)

      zoomAnimRef.current.active = false
      flyToRef.current.active = false
      hoveredFlightIdRef.current = null
      setCanvasCursor('grabbing')
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
    },
    [setCanvasCursor]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (!pinchRef.current.has(e.pointerId)) {
        updateHoveredFlight(e.clientX, e.clientY)
        return
      }
      pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pinchStateRef.current.active && pinchRef.current.size >= 2) {
        hoveredFlightIdRef.current = null
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
        hoveredFlightIdRef.current = null
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
    },
    [updateHoveredFlight]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
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
        updateHoveredFlight(e.clientX, e.clientY)
      }
    },
    [updateHoveredFlight]
  )

  const onPointerLeave = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (dragRef.current.active || pinchStateRef.current.active) return
      hoveredFlightIdRef.current = null
      setCanvasCursor('grab')
    },
    [setCanvasCursor]
  )

  const onLostPointerCapture = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (!dragRef.current.active && !pinchStateRef.current.active && pinchRef.current.size === 0) {
        setCanvasCursor(hoveredFlightIdRef.current ? 'pointer' : 'grab')
        return
      }
      dragRef.current.active = false
      pinchStateRef.current.active = false
      pinchRef.current.clear()
      multitouchRef.current = false
      momentumRef.current = { vx: 0, vy: 0 }
      setCanvasCursor('grab')
    },
    [setCanvasCursor]
  )

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation()
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

  function handleExpand() {
    const card = cardRef.current
    if (!card) return
    setRouteGestureLock('world-map-fullscreen', true)
    const rect = card.getBoundingClientRect()
    setOriginRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    lockCenterRef.current = true
    activeCanvasRef.current = 'full'
    momentumRef.current = { vx: 0, vy: 0 }
    zoomAnimRef.current.active = false
    hoveredFlightIdRef.current = null
    setCanvasCursor('grab')
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
    const controlsTid = setTimeout(
      () => {
        setControlsVisible(true)
      },
      reduceMotion ? 0 : 120
    )
    const unlockTid = setTimeout(
      () => {
        lockCenterRef.current = false
      },
      reduceMotion ? 0 : EXPAND_DURATION
    )
    return () => {
      clearTimeout(expandTid)
      clearTimeout(controlsTid)
      clearTimeout(unlockTid)
    }
  }, [expanded, originRect, reduceMotion])

  const handleCollapse = useCallback(() => {
    lockCenterRef.current = true
    dragRef.current.active = false
    pinchStateRef.current.active = false
    pinchRef.current.clear()
    multitouchRef.current = false
    momentumRef.current = { vx: 0, vy: 0 }
    zoomAnimRef.current.active = false
    hoveredFlightIdRef.current = null
    setCanvasCursor('grab')
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
      setCollapsing(true)
      setTimeout(
        () => {
          collapsingRef.current = false
          lockCenterRef.current = true
          setCollapsing(false)
          activeCanvasRef.current = 'card'
          setExpanded(false)
        },
        reduceMotion ? 0 : EXPAND_DURATION
      )
    } else {
      lockCenterRef.current = true
      activeCanvasRef.current = 'card'
      setExpanded(false)
    }
  }, [reduceMotion, setCanvasCursor])

  useEffect(() => {
    if (!expanded || selectedFlight) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCollapse()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, selectedFlight, handleCollapse])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <>
      {/* Card preview — fills remaining space */}
      <div className='flex min-h-0 flex-1 flex-col px-5 py-3'>
        <div
          ref={cardRef}
          onClick={firstPollDone ? handleExpand : undefined}
          className={`bg-bg relative min-h-0 flex-1 overflow-hidden rounded-xl transition-[transform,filter] duration-200 ${collapsing ? 'border-transparent shadow-none' : 'border-line border shadow-lg'} ${firstPollDone && !expanded && !collapsing ? 'cursor-pointer hover:scale-[1.01] hover:shadow-xl hover:brightness-95 active:scale-[0.99]' : ''}`}
        >
          {firstPollDone && (
            <canvas
              ref={cardCanvasRef}
              className='absolute inset-0 h-full w-full'
            />
          )}

          {!firstPollDone && !expanded && <div className='bg-line/60 absolute inset-0 z-10 animate-pulse' />}

          {!expanded && (
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3 transition-opacity duration-300 ${firstPollDone ? 'opacity-100' : 'opacity-0'}`}
            >
              {flightCount > 0 && (
                <span className='text-ink-faint text-xs'>
                  {flightCount.toLocaleString()} {t(locale, 'world.map.planes')}
                </span>
              )}
              <span className='text-ink-faint font-display ml-auto text-xs'>{t(locale, 'world.map.explore')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen expanded view */}
      {typeof document !== 'undefined' &&
        expanded &&
        originRect != null &&
        createPortal(
          <div
            ref={overlayRef}
            className={`bg-bg ${collapsing ? 'border-line border shadow-lg' : ''}`}
            style={{
              position: 'fixed',
              zIndex: 40,
              overflow: 'hidden',
              transition:
                reduceMotion ? 'none' : (
                  `top ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1), left ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1), width ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1), height ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1), border-radius ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1)`
                ),
              top: originRect!.top,
              left: originRect!.left,
              width: originRect!.width,
              height: originRect!.height,
              borderRadius: 12
            }}
          >
            <canvas
              ref={fullCanvasRef}
              className={`absolute inset-0 h-full w-full touch-none ${
                mapCursor === 'grabbing' ? 'cursor-grabbing'
                : mapCursor === 'pointer' ? 'cursor-pointer'
                : 'cursor-grab'
              }`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={onPointerLeave}
              onLostPointerCapture={onLostPointerCapture}
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
                    className='pointer-events-none flex items-start justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)]'
                  >
                    <Button
                      variant='secondary'
                      size='xs'
                      shape='pill'
                      className='!bg-paper/90 hover:!bg-paper !text-ink pointer-events-auto w-10 !px-0 shadow-sm backdrop-blur-sm'
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
                          x1='18'
                          y1='6'
                          x2='6'
                          y2='18'
                        />
                        <line
                          x1='6'
                          y1='6'
                          x2='18'
                          y2='18'
                        />
                      </svg>
                    </Button>
                    {isDev && (
                      <div className='pointer-events-auto'>
                        <DevPanel
                          flightCount={flightCount}
                          cacheMetaRef={cacheMetaRef}
                          pollTimeRef={pollTimeRef}
                          onSync={syncFlights}
                        />
                      </div>
                    )}
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
                    className='pointer-events-none flex items-end justify-between px-4 pb-[max(env(safe-area-inset-bottom),1rem)]'
                  >
                    {flightCount > 0 ?
                      <span className='text-ink-faint text-xs'>
                        {flightCount.toLocaleString()} {t(locale, 'world.map.planes')}
                      </span>
                    : <span />}

                    <div className='pointer-events-auto flex flex-col gap-2'>
                      <Button
                        variant='secondary'
                        size='xs'
                        shape='pill'
                        className='!bg-paper/90 hover:!bg-paper !text-ink w-10 !px-0 shadow-sm backdrop-blur-sm'
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
                      </Button>
                      <Button
                        variant='secondary'
                        size='xs'
                        shape='pill'
                        className='!bg-paper/90 hover:!bg-paper !text-ink w-10 !px-0 shadow-sm backdrop-blur-sm'
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
                      </Button>
                      <Button
                        variant='secondary'
                        size='xs'
                        shape='pill'
                        className='!bg-paper/90 hover:!bg-paper !text-ink w-10 !px-0 shadow-sm backdrop-blur-sm'
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
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {collapsing && (
              <div className='pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-3'>
                {flightCount > 0 && (
                  <span className='text-ink-faint text-xs'>
                    {flightCount.toLocaleString()} {t(locale, 'world.map.planes')}
                  </span>
                )}
                <span className='text-ink-faint font-display ml-auto text-xs'>{t(locale, 'world.map.explore')}</span>
              </div>
            )}

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

function MapErrorFallback({ locale }: { locale: Locale }) {
  return (
    <motion.div
      className='flex min-h-0 flex-1 flex-col px-5 py-3'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={MOTION_TRANSITION.screen}
    >
      <div className='bg-bg border-line relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border p-6 shadow-lg'>
        <motion.div
          className='w-32'
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={withMotionDelay(MOTION_TRANSITION.sectionMedium, 0.06)}
        >
          <Image
            src='/radar-error-light.png'
            alt=''
            aria-hidden
            width={1254}
            height={1254}
            unoptimized
            className='theme-light-only h-auto w-full select-none'
            draggable={false}
          />
          <Image
            src='/radar-error-dark.png'
            alt=''
            aria-hidden
            width={1254}
            height={1254}
            unoptimized
            className='theme-dark-only h-auto w-full select-none'
            draggable={false}
          />
        </motion.div>
        <motion.div
          className='flex flex-col items-center gap-1 text-center'
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={withMotionDelay(MOTION_TRANSITION.screen, 0.14)}
        >
          <span className='text-ink text-sm'>{t(locale, 'world.map.errorTitle')}</span>
          <span className='text-ink-faint text-xs'>{t(locale, 'world.map.errorSubtitle')}</span>
        </motion.div>
      </div>
    </motion.div>
  )
}

type CollapsingRect = { top: number; left: number; width: number; height: number }

function CollapsingOverlay({ originRect }: { originRect: CollapsingRect }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const tid = setTimeout(() => {
      el.style.top = `${originRect.top}px`
      el.style.left = `${originRect.left}px`
      el.style.width = `${originRect.width}px`
      el.style.height = `${originRect.height}px`
      el.style.borderRadius = '12px'
    }, 0)
    return () => clearTimeout(tid)
  }, [originRect])

  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      ref={ref}
      className='bg-bg'
      style={{
        position: 'fixed',
        zIndex: 40,
        overflow: 'hidden',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        borderRadius: 0,
        transition: reduceMotion ? 'none' : `top ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1), left ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1), width ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1), height ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1), border-radius ${EXPAND_DURATION}ms cubic-bezier(0.22,1,0.36,1)`
      }}
    />,
    document.body
  )
}

type BoundaryState = { hasError: boolean; collapsing: boolean; collapsingRect: CollapsingRect | null }

class MapErrorBoundary extends Component<{ locale: Locale; children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false, collapsing: false, collapsingRect: null }

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return {
      hasError: true,
      collapsing: _preErrorExpanded,
      collapsingRect: _preErrorExpanded ? _preErrorOriginRect : null
    }
  }

  componentDidCatch() {
    if (this.state.collapsing) {
      setTimeout(() => {
        this.setState({ collapsing: false })
      }, EXPAND_DURATION)
    }
  }

  render() {
    const { hasError, collapsing, collapsingRect } = this.state
    if (!hasError) return <>{this.props.children}</>
    return (
      <>
        {collapsing && collapsingRect && <CollapsingOverlay originRect={collapsingRect} />}
        <AnimatePresence>
          {!collapsing && <MapErrorFallback key='error' locale={this.props.locale} />}
        </AnimatePresence>
      </>
    )
  }
}

export function WorldMap({ locale }: { locale: Locale }) {
  return (
    <MapErrorBoundary locale={locale}>
      <WorldMapImpl locale={locale} />
    </MapErrorBoundary>
  )
}

type DevSnapshot = {
  pollAge: string
  cacheAge: string
  cached: boolean | null
  ttl: number | null
}

function DevPanel({
  flightCount,
  cacheMetaRef,
  pollTimeRef,
  onSync
}: {
  flightCount: number
  cacheMetaRef: React.RefObject<{ cached: boolean; cachedAt: number; ttl: number } | null>
  pollTimeRef: React.RefObject<number>
  onSync: () => Promise<unknown>
}) {
  const [snap, setSnap] = useState<DevSnapshot>({ pollAge: '—', cacheAge: '—', cached: null, ttl: null })
  const sync = usePromiseStatus({ successMs: 1200 })

  useEffect(() => {
    function sample() {
      const now = Date.now()
      const meta = cacheMetaRef.current
      const pt = pollTimeRef.current
      setSnap({
        pollAge: pt > 0 ? ((now - pt) / 1000).toFixed(0) : '—',
        cacheAge: meta?.cachedAt ? ((now - meta.cachedAt) / 1000).toFixed(0) : '—',
        cached: meta?.cached ?? null,
        ttl: meta?.ttl ?? null
      })
    }
    sample()
    const id = setInterval(sample, 1000)
    return () => clearInterval(id)
  }, [cacheMetaRef, pollTimeRef])

  const sourceLabel =
    snap.cached === null ? '—'
    : snap.cached ? 'cache'
    : 'live'

  return (
    <div className='border-line bg-paper/90 flex flex-col gap-3 rounded-2xl border px-4 py-3 backdrop-blur-sm'>
      <div className='flex items-center gap-3'>
        <div className='flex flex-col'>
          <span className='text-ink font-mono text-lg leading-tight tabular-nums'>{flightCount.toLocaleString()}</span>
          <span className='text-ink-faint text-xs'>flights</span>
        </div>
        <div className='bg-line mx-1 h-8 w-px' />
        <div className='flex flex-col'>
          <span className={`font-mono text-lg leading-tight tabular-nums ${snap.cached === false ? 'text-sage' : 'text-ink'}`}>{sourceLabel}</span>
          <span className='text-ink-faint text-xs'>source</span>
        </div>
      </div>

      <div className='bg-line h-px' />

      <div className='grid grid-cols-2 gap-x-6 gap-y-2'>
        <div className='flex flex-col'>
          <span className='text-ink font-mono text-sm leading-tight tabular-nums'>{snap.cacheAge}s</span>
          <span className='text-ink-faint text-[11px]'>data age</span>
        </div>
        <div className='flex flex-col'>
          <span className='text-ink font-mono text-sm leading-tight tabular-nums'>{snap.pollAge}s</span>
          <span className='text-ink-faint text-[11px]'>poll age</span>
        </div>
        <div className='flex flex-col'>
          <span className='text-ink font-mono text-sm leading-tight tabular-nums'>{snap.ttl ?? '—'}s</span>
          <span className='text-ink-faint text-[11px]'>ttl</span>
        </div>
        <div className='flex flex-col'>
          <span className='text-ink font-mono text-sm leading-tight tabular-nums'>{POLL_INTERVAL / 1000}s</span>
          <span className='text-ink-faint text-[11px]'>poll interval</span>
        </div>
      </div>

      <Button
        variant='secondary'
        size='xs'
        fullWidth
        status={sync.status}
        pendingLabel='syncing'
        successLabel='synced'
        errorLabel='failed'
        onClick={() => sync.run(onSync)}
      >
        force sync
      </Button>
    </div>
  )
}
