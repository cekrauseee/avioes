'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Flight } from '../lib/geo'
import { t } from '../lib/i18n'
import { MOTION_TRANSITION } from '../lib/motion'
import type { Locale } from '../lib/types'

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

function compassDir(deg: number): string {
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8
  return COMPASS[idx]
}

export function FlightDetailSheet({ flight, onClose, locale }: { flight: Flight | null; onClose: () => void; locale: Locale }) {
  useEffect(() => {
    if (!flight) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flight, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {flight && (
        <>
          <motion.div
            key='flight-backdrop'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION_TRANSITION.sheetBackdrop}
            onClick={onClose}
            className='bg-ink/20 fixed inset-0 z-[60]'
          />
          <motion.div
            key='flight-sheet'
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={MOTION_TRANSITION.sheetPanel}
            className='bg-bg fixed right-0 bottom-0 left-0 z-[70] mx-auto w-full max-w-[630px] rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1.25rem)]'
          >
            <div className='flex justify-center pt-3 pb-1'>
              <div className='bg-line h-1 w-10 rounded-full' />
            </div>

            <div className='px-6 pt-3 pb-4'>
              <p className='font-display text-2xl tracking-tight'>{flight.callsign || flight.icao24}</p>

              <div className='mt-4 grid grid-cols-2 gap-x-6 gap-y-3'>
                <InfoRow
                  label={t(locale, 'world.map.country')}
                  value={flight.originCountry}
                />
                <InfoRow
                  label={t(locale, 'world.map.altitude')}
                  value={`${Math.round(flight.altitude).toLocaleString()} m`}
                />
                <InfoRow
                  label={t(locale, 'world.map.speed')}
                  value={`${Math.round(flight.velocity * 3.6).toLocaleString()} km/h`}
                />
                <InfoRow
                  label={t(locale, 'world.map.heading')}
                  value={`${Math.round(flight.heading)}° ${compassDir(flight.heading)}`}
                />
                <InfoRow
                  label={t(locale, 'world.map.verticalRate')}
                  value={`${
                    flight.verticalRate > 0 ? '↑'
                    : flight.verticalRate < 0 ? '↓'
                    : '—'
                  } ${Math.abs(Math.round(flight.verticalRate))} m/s`}
                />
                <InfoRow
                  label={t(locale, 'world.map.coords')}
                  value={`${flight.lat.toFixed(2)}, ${flight.lon.toFixed(2)}`}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className='text-ink-faint text-[11px]'>{label}</span>
      <p className='font-mono text-sm tabular-nums'>{value}</p>
    </div>
  )
}
