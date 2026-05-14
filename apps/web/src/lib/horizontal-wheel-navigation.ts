'use client'

import { useEffect, useRef, type WheelEvent } from 'react'

type Direction = 1 | -1

const IDLE_RESET_MS = 180
const MIN_HORIZONTAL_DELTA = 1.5
const HORIZONTAL_INTENT_RATIO = 0.75
const LINE_DELTA_PX = 16

type WheelGesture = {
  direction: Direction | 0
  locked: boolean
  total: number
}

function normalizeDelta(delta: number, mode: number) {
  if (mode === 1) return delta * LINE_DELTA_PX
  if (mode === 2) return delta * window.innerWidth
  return delta
}

function shouldIgnoreTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="slider"]'))
}

export function useArrowKeyNavigation(onNavigate: (direction: Direction) => void, enabled = true) {
  const navigateRef = useRef(onNavigate)

  useEffect(() => {
    navigateRef.current = onNavigate
  }, [onNavigate])

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (shouldIgnoreTarget(event.target)) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

      event.preventDefault()
      navigateRef.current(event.key === 'ArrowRight' ? 1 : -1)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}

export function useHorizontalWheelNavigation(onNavigate: (direction: Direction) => void, threshold: number) {
  const gesture = useRef<WheelGesture>({ direction: 0, locked: false, total: 0 })
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearReset = () => {
    if (!resetTimeout.current) return
    clearTimeout(resetTimeout.current)
    resetTimeout.current = null
  }

  const resetGesture = () => {
    gesture.current = { direction: 0, locked: false, total: 0 }
  }

  const scheduleReset = () => {
    clearReset()
    resetTimeout.current = setTimeout(resetGesture, IDLE_RESET_MS)
  }

  useEffect(() => {
    return () => {
      if (!resetTimeout.current) return
      clearTimeout(resetTimeout.current)
    }
  }, [])

  return (event: WheelEvent<HTMLElement>) => {
    if (shouldIgnoreTarget(event.target)) return

    const deltaX = normalizeDelta(event.deltaX, event.deltaMode)
    const deltaY = normalizeDelta(event.deltaY, event.deltaMode)
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (absX < MIN_HORIZONTAL_DELTA || absX < absY * HORIZONTAL_INTENT_RATIO) return

    event.preventDefault()

    const direction: Direction = deltaX > 0 ? 1 : -1
    const state = gesture.current

    if (state.locked) {
      scheduleReset()
      return
    }

    if (state.direction !== direction) {
      state.direction = direction
      state.total = 0
    }

    state.total += absX

    if (state.total >= threshold) {
      state.locked = true
      state.total = 0
      onNavigate(direction)
    }

    scheduleReset()
  }
}
