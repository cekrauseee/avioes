'use client'

import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MOTION_TRANSITION } from '../lib/motion'

export function Sheet({
  open,
  onClose,
  layout,
  children
}: {
  open: boolean
  onClose: () => void
  layout?: boolean
  children: React.ReactNode
}) {
  const dragControls = useDragControls()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key='backdrop'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION_TRANSITION.sheetBackdrop}
            onClick={onClose}
            className='bg-ink/20 fixed inset-0 z-40'
          />
          <motion.div
            key='sheet'
            {...(layout ? { layout: 'position' as const } : {})}
            drag='y'
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 50 || info.velocity.y > 150) {
                onClose()
              }
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={
              layout ?
                { ...MOTION_TRANSITION.sheetPanel, layout: MOTION_TRANSITION.sheetLayout }
              : MOTION_TRANSITION.sheetPanel
            }
            className='bg-bg fixed right-0 bottom-0 left-0 z-50 mx-auto w-full max-w-[630px] rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1.5rem)]'
          >
            <div
              className='flex touch-none select-none justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing'
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className='bg-line h-1 w-10 rounded-full' />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
