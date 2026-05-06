'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../lib/i18n'
import { selectLocale, useOfflineState } from '../lib/offline-store'
import { Button } from './button'

export function InviteShareSheet({ open, onClose, inviteUrl, email }: { open: boolean; onClose: () => void; inviteUrl: string; email: string }) {
  const state = useOfflineState()
  const locale = selectLocale(state)
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(id)
  }, [copied])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
    } catch {}
  }, [inviteUrl])

  const handleShare = useCallback(async () => {
    try {
      await navigator.share({ url: inviteUrl })
    } catch {}
  }, [inviteUrl])

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
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className='bg-ink/20 fixed inset-0 z-40'
          />
          <motion.div
            key='sheet'
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className='bg-bg fixed right-0 bottom-0 left-0 z-50 mx-auto w-full max-w-[630px] rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1.25rem)]'
          >
            <div className='flex justify-center pt-3 pb-1'>
              <div className='bg-line h-1 w-10 rounded-full' />
            </div>

            <div className='px-6 pt-4 pb-2'>
              <p className='font-display text-ink text-lg'>{t(locale, 'invite.share.title')}</p>
              <p className='text-ink-faint mt-1 text-xs'>{email}</p>
            </div>

            <div className='mx-6 mt-2 rounded-xl bg-[var(--color-line)]/10 px-4 py-3'>
              <p className='text-ink-soft font-mono text-xs break-all'>{inviteUrl}</p>
            </div>

            <div className='flex flex-col gap-2 px-6 pt-4'>
              <Button
                variant='secondary'
                size='md'
                fullWidth
                status={copied ? 'success' : 'idle'}
                successLabel={t(locale, 'invite.share.copied')}
                onClick={handleCopy}
              >
                {t(locale, 'invite.share.copy')}
              </Button>
              {canShare && (
                <Button
                  variant='secondary'
                  size='md'
                  fullWidth
                  onClick={handleShare}
                >
                  {t(locale, 'invite.share.share')}
                </Button>
              )}
              <Button
                variant='primary'
                size='md'
                fullWidth
                onClick={onClose}
              >
                {t(locale, 'invite.share.done')}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
