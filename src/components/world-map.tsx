'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  drawAirplanes,
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
import { MOTION_TRANSITION } from '../lib/motion'
import type { Locale } from '../lib/types'
import { FlightDetailSheet } from './flight-detail-sheet'

const POLL_INTERVAL = 12_000
const DEFAULT_VP: Viewport = { x: 0, y: 0, scale: 1 }
const SCALE_MIN = 0.5
const SCALE_MAX = 8
const TAP_THRESHOLD = 5
const HIT_THRESHOLD = 3

export function WorldMap({ locale }: { locale: Locale }) {
  const reduceMotion = useReducedMotion()
  const [fullscreen, setFullscreen] = useState(false)
  const [flightCount, setFlightCount] = useState(0)
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)

  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const fullCanvasRef = useRef<HTMLCanvasElement>(null)
  const geojsonRef = useRef<GeoJSON | null>(null)
  const flightsRef = useRef<Flight[]>([])
  const pollTimeRef = useRef(0)
  const vpRef = useRef<Viewport>({ ...DEFAULT_VP })
  const rafRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

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
      .then((data) => { geojsonRef.current = data })
      .catch(() => {})
  }, [])

  const fetchFlights = useCallback(() => {
    fetch('/api/flights')
      .then((r) => r.json())
      .then((data: { flights: Flight[]; time: number }) => {
        flightsRef.current = data.flights
        pollTimeRef.current = Date.now()
        setFlightCount(data.flights.length)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchFlights()
    const id = setInterval(fetchFlights, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchFlights])

  const draw = useCallback(
    (canvas: HTMLCanvasElement, vp: Viewport, interpolate: boolean) => {
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

      const el = canvas.closest('[data-palette]') as HTMLElement || document.documentElement
      const colors = readMapColors(el)

      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, w, h)

      if (geojsonRef.current) {
        drawWorldOutline(ctx, geojsonRef.current, vp, w, h, colors)
      }

      let flights = flightsRef.current
      if (interpolate && pollTimeRef.current > 0) {
        const dt = (Date.now() - pollTimeRef.current) / 1000
        flights = interpolateFlights(flights, dt)
      }
      drawAirplanes(ctx, flights, vp, w, h, colors)
    },
    []
  )

  useEffect(() => {
    const tick = () => {
      const previewCanvas = previewCanvasRef.current
      if (previewCanvas && !fullscreen) {
        draw(previewCanvas, DEFAULT_VP, !reduceMotion)
      }
      const fullCanvas = fullCanvasRef.current
      if (fullCanvas && fullscreen) {
        draw(fullCanvas, vpRef.current, !reduceMotion)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw, fullscreen, reduceMotion])

  const onPointerDownFull = useCallback((e: React.PointerEvent) => {
    const canvas = fullCanvasRef.current
    if (!canvas) return
    ;(canvas as HTMLElement).setPointerCapture(e.pointerId)

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

  const onPointerMoveFull = useCallback((e: React.PointerEvent) => {
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pinchStateRef.current.active && pinchRef.current.size >= 2) {
      const [p1, p2] = [...pinchRef.current.values()]
      const dx = p1.x - p2.x
      const dy = p1.y - p2.y
      const dist = Math.hypot(dx, dy) || 1
      const cx = (p1.x + p2.x) / 2
      const cy = (p1.y + p2.y) / 2
      const s = pinchStateRef.current
      const newScale = Math.max(
        SCALE_MIN,
        Math.min(SCALE_MAX, s.startScale * (dist / s.startDist))
      )
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

  const onPointerUpFull = useCallback(
    (e: React.PointerEvent) => {
      pinchRef.current.delete(e.pointerId)

      if (pinchStateRef.current.active && pinchRef.current.size < 2) {
        pinchStateRef.current.active = false
      }

      if (pinchRef.current.size === 0) {
        if (
          dragRef.current.active &&
          !multitouchRef.current &&
          dragRef.current.moved < TAP_THRESHOLD
        ) {
          const canvas = fullCanvasRef.current
          if (canvas) {
            const rect = canvas.getBoundingClientRect()
            const sx = e.clientX - rect.left
            const sy = e.clientY - rect.top
            const [lon, lat] = screenToLonLat(sx, sy, vpRef.current, rect.width, rect.height)
            let flights = flightsRef.current
            if (!reduceMotion && pollTimeRef.current > 0) {
              const dt = (Date.now() - pollTimeRef.current) / 1000
              flights = interpolateFlights(flights, dt)
            }
            const hit = findFlightAt(flights, lon, lat, HIT_THRESHOLD / vpRef.current.scale)
            if (hit) setSelectedFlight(hit)
          }
        }
        dragRef.current.active = false
        multitouchRef.current = false
      }
    },
    [reduceMotion]
  )

  const onWheelFull = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const canvas = fullCanvasRef.current
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

  useEffect(() => {
    if (!fullscreen) {
      vpRef.current = { ...DEFAULT_VP }
    }
  }, [fullscreen])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedFlight(null)
        setFullscreen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  const transitionDuration = reduceMotion ? { duration: 0 } : undefined

  return (
    <div ref={containerRef} className='px-5 pt-4'>
      <button
        type='button'
        onClick={() => setFullscreen(true)}
        className='border-line bg-paper relative w-full overflow-hidden rounded-2xl border'
      >
        <div className='relative aspect-[16/9] w-full'>
          <canvas
            ref={previewCanvasRef}
            className='absolute inset-0 h-full w-full'
          />
        </div>
        <div className='flex items-center justify-between px-4 py-2.5'>
          <span className='text-ink-faint text-xs'>
            {flightCount > 0 ? `${flightCount.toLocaleString()} ${t(locale, 'world.map.planes')}` : ''}
          </span>
          <span className='text-ink-faint text-xs italic'>
            {t(locale, 'world.map.explore')}
          </span>
        </div>
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {fullscreen && (
              <>
                <motion.div
                  key='map-backdrop'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transitionDuration ?? MOTION_TRANSITION.sheetBackdrop}
                  className='bg-bg fixed inset-0 z-40'
                />
                <motion.div
                  key='map-panel'
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={transitionDuration ?? MOTION_TRANSITION.sheetPanel}
                  className='bg-bg fixed inset-0 z-50 flex flex-col'
                >
                  <canvas
                    ref={fullCanvasRef}
                    className='h-full w-full touch-none'
                    onPointerDown={onPointerDownFull}
                    onPointerMove={onPointerMoveFull}
                    onPointerUp={onPointerUpFull}
                    onPointerCancel={onPointerUpFull}
                    onWheel={onWheelFull}
                  />

                  <button
                    type='button'
                    onClick={() => {
                      setSelectedFlight(null)
                      setFullscreen(false)
                    }}
                    aria-label={t(locale, 'world.map.close')}
                    className='text-ink-faint absolute top-[max(env(safe-area-inset-top),1rem)] right-4 z-10 flex h-11 w-11 items-center justify-center text-xl'
                  >
                    ✕
                  </button>

                  {flightCount > 0 && (
                    <div className='text-ink-faint absolute bottom-[max(env(safe-area-inset-bottom),1rem)] left-4 z-10 text-xs'>
                      {flightCount.toLocaleString()} {t(locale, 'world.map.planes')}
                    </div>
                  )}

                  <FlightDetailSheet
                    flight={selectedFlight}
                    onClose={() => setSelectedFlight(null)}
                    locale={locale}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}
