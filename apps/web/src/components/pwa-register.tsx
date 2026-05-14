'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    let idleId: number | null = null
    let timerId: number | null = null

    const register = () => {
      const run = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      }
      const requestIdle = (window as Window & { requestIdleCallback?: Window['requestIdleCallback'] }).requestIdleCallback
      if (requestIdle) {
        idleId = requestIdle.call(window, run, { timeout: 4000 })
      } else {
        timerId = window.setTimeout(run, 2500)
      }
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }

    return () => {
      window.removeEventListener('load', register)
      const cancelIdle = (window as Window & { cancelIdleCallback?: Window['cancelIdleCallback'] }).cancelIdleCallback
      if (idleId !== null && cancelIdle) cancelIdle.call(window, idleId)
      if (timerId !== null) window.clearTimeout(timerId)
    }
  }, [])
  return null
}
