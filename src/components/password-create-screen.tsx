'use client'

import { motion } from 'motion/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { consumePasswordCreationToken } from '../actions'
import { authClient } from '../lib/auth-client'
import { t } from '../lib/i18n'
import { selectLocale, useOfflineState } from '../lib/offline-store'
import type { Locale } from '../lib/types'

export function PasswordCreateScreen({ token, valid }: { token: string; valid: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const reason = searchParams.get('reason')
  const isGoogleReason = reason === 'google'

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [step, setStep] = useState<'form' | 'confirm-unlink' | 'done'>(valid ? 'form' : 'done')
  const [unlinking, setUnlinking] = useState(false)

  if (!valid) {
    return (
      <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
        <Header locale={locale} />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className='mt-12'
        >
          <h1 className='font-display text-[36px] leading-[0.93] tracking-tight'>
            {t(locale, 'password.expiredLine1')}
            <br />
            <span className='text-clay italic'>{t(locale, 'password.expiredItalic')}</span>
          </h1>
          <p className='text-ink-faint mt-3 text-sm'>{t(locale, 'password.expiredBody')}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className='mt-10'
        >
          <button
            type='button'
            onClick={() => router.push('/auth')}
            className='bg-sage text-bg flex h-12 w-full items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-[0.98]'
          >
            {t(locale, 'auth.back')} →
          </button>
        </motion.div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      setError(t(locale, 'password.tooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t(locale, 'password.mismatch'))
      return
    }
    setError(null)

    start(async () => {
      const res = await consumePasswordCreationToken(token, newPassword)
      if (!res.ok) {
        setError(res.error)
        return
      }
      if (isGoogleReason) {
        setStep('confirm-unlink')
      } else {
        setStep('done')
      }
    })
  }

  const handleUnlinkGoogle = async () => {
    setUnlinking(true)
    setError(null)
    const res = await authClient.unlinkAccount({ providerId: 'google' })
    if (res.error) {
      setError(res.error.message ?? t(locale, 'password.unlinkFailed'))
      setUnlinking(false)
      return
    }
    setStep('done')
    setUnlinking(false)
  }

  if (step === 'confirm-unlink') {
    return (
      <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
        <Header locale={locale} />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className='mt-12'
        >
          <h1 className='font-display text-[36px] leading-[0.93] tracking-tight'>
            {t(locale, 'password.unlinkHeadingLine1')}
            <br />
            <span className='text-clay italic'>{t(locale, 'password.unlinkHeadingItalic')}</span>
          </h1>
          <p className='text-ink-faint mt-3 text-sm'>{t(locale, 'password.unlinkSubtitle')}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className='mt-10 flex flex-col gap-3'
        >
          <button
            type='button'
            disabled={unlinking}
            onClick={handleUnlinkGoogle}
            className='bg-clay text-bg flex h-12 w-full items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50'
          >
            {unlinking ?
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {t(locale, 'password.unlinking')}
              </motion.span>
            : t(locale, 'password.unlinkButton')}
          </button>
          <button
            type='button'
            onClick={() => router.push('/settings?tab=account')}
            className='border-line bg-paper text-ink-soft hover:bg-line/40 flex h-12 w-full items-center justify-center rounded-xl border text-sm transition-all active:scale-[0.98]'
          >
            {t(locale, 'password.unlinkSkip')}
          </button>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className='text-clay text-sm'
            >
              {error}
            </motion.p>
          )}
        </motion.div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
        <Header locale={locale} />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className='mt-12'
        >
          <h1 className='font-display text-[36px] leading-[0.93] tracking-tight'>
            {t(locale, isGoogleReason ? 'password.unlinkDoneTitle' : 'password.doneTitle')}
            <br />
            <span className='text-sage italic'>{t(locale, isGoogleReason ? 'password.unlinkDoneTitleItalic' : 'password.doneTitleItalic')}</span>
          </h1>
          <p className='text-ink-faint mt-3 text-sm'>{t(locale, isGoogleReason ? 'password.unlinkDoneBody' : 'password.doneBody')}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className='mt-10'
        >
          <button
            type='button'
            onClick={() => router.push('/settings?tab=account')}
            className='bg-sage text-bg flex h-12 w-full items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-[0.98]'
          >
            {t(locale, 'password.backToAccount')} →
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
      <Header locale={locale} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className='mt-12'
      >
        <h1 className='font-display text-[36px] leading-[0.93] tracking-tight'>
          {isGoogleReason ? t(locale, 'password.googleHeadingLine1') : t(locale, 'password.setHeadingLine1')}
          <br />
          <span className='text-sage italic'>{isGoogleReason ? t(locale, 'password.googleHeadingItalic') : t(locale, 'password.setHeadingItalic')}</span>
        </h1>
        <p className='text-ink-faint mt-3 text-sm'>{isGoogleReason ? t(locale, 'password.googleSubtitle') : t(locale, 'password.setSubtitle')}</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        onSubmit={handleSubmit}
        className='mt-10 flex flex-col gap-4'
      >
        <div className='flex flex-col gap-1.5'>
          <label className='text-ink-faint text-xs'>{t(locale, 'password.newLabel')}</label>
          <input
            type='password'
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder='••••••••'
            autoComplete='new-password'
            autoFocus
            className='border-line bg-paper text-ink placeholder:text-ink-faint ring-sage/40 w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none focus:ring-2'
          />
        </div>
        <div className='flex flex-col gap-1.5'>
          <label className='text-ink-faint text-xs'>{t(locale, 'password.confirmLabel')}</label>
          <input
            type='password'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder='••••••••'
            autoComplete='new-password'
            className='border-line bg-paper text-ink placeholder:text-ink-faint ring-sage/40 w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none focus:ring-2'
          />
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-clay text-sm'
          >
            {error}
          </motion.p>
        )}

        <button
          type='submit'
          disabled={pending}
          className='bg-sage text-bg mt-2 flex h-12 items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50'
        >
          {pending ?
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {t(locale, 'password.saving')}
            </motion.span>
          : t(locale, 'password.createButton')}
        </button>
      </motion.form>
    </div>
  )
}

function Header({ locale }: { locale: Locale }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className='flex items-center justify-between gap-3'
    >
      <span className='text-ink-faint font-display text-sm italic'>{t(locale, 'auth.header')}</span>
    </motion.header>
  )
}
