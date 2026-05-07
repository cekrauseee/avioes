'use client'

import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

type AvatarProps = {
  image: string | null
  firstName: string
  accentBg: string
  size: number
  initialClassName?: string
  className?: string
}

export function Avatar({ image, firstName, accentBg, size, initialClassName = 'text-base font-medium', className = '' }: AvatarProps) {
  const initial = (firstName || '?').slice(0, 1).toUpperCase()
  const ready = usePreloadedImage(image)
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${accentBg} ${className}`}
      style={{ width: size, height: size }}
    >
      <span className={`text-bg absolute inset-0 flex items-center justify-center ${initialClassName}`}>{initial}</span>
      <AnimatePresence>
        {image && ready && (
          <motion.div
            key={ready}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className='absolute inset-0'
          >
            <Image
              src={ready}
              alt=''
              width={size}
              height={size}
              unoptimized
              referrerPolicy='no-referrer'
              draggable={false}
              className='h-full w-full object-cover'
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function usePreloadedImage(src: string | null): string | null {
  const [ready, setReady] = useState<string | null>(null)

  useEffect(() => {
    if (!src) return
    let cancelled = false
    const img = new window.Image()
    const handleLoad = () => {
      if (!cancelled) setReady(src)
    }
    img.addEventListener('load', handleLoad)
    img.src = src
    if (img.complete && img.naturalWidth > 0) handleLoad()
    return () => {
      cancelled = true
      img.removeEventListener('load', handleLoad)
    }
  }, [src])

  // When src is cleared, the visible motion.div is gated on `src && ready` below,
  // so ready can lag without showing a stale image; we only clear it on the
  // next mount that needs it.
  return src ? ready : null
}
