'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { requestPasswordChange, requestPasswordCreation } from '../actions'
import { authClient } from '../lib/auth-client'
import { t } from '../lib/i18n'
import { useNavDirection } from '../lib/nav-direction'
import { selectLocale, useOfflineState } from '../lib/offline-store'
import type { Locale } from '../lib/types'
import { Skel } from './skeleton'

type Mode = 'set' | 'change' | null
type Step = 'request' | 'sent' | 'confirm-unlink' | 'done'

export function PasswordScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { set: setNavDirection } = useNavDirection()
  const reason = searchParams.get('reason')
  const state = useOfflineState()
  const locale = selectLocale(state)

  const [mode, setMode] = useState<Mode>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [step, setStep] = useState<Step>('request')
  const [unlinking, setUnlinking] = useState(false)

  const goBackToAccount = () => {
    setNavDirection(-1)
    router.back()
  }

  useEffect(() => {
    authClient.listAccounts().then((res) => {
      if (!res.data) return
      const hasCredential = res.data.some((a) => a.providerId === 'credential')
      setMode(hasCredential ? 'change' : 'set')
    })
  }, [])

  const isGoogleReason = reason === 'google'
  const heading = headingFor(mode, isGoogleReason, locale)
  const subtitle = subtitleFor(mode, isGoogleReason, locale)

  const handleRequest = () => {
    setError(null)
    start(async () => {
      const res = mode === 'change' ? await requestPasswordChange() : await requestPasswordCreation(reason ?? undefined)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setStep('sent')
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

  if (step === 'sent') {
    return (
      <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
        <Header
          onBack={goBackToAccount}
          locale={locale}
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className='mt-12'
        >
          <h1 className='font-display text-[36px] leading-[0.93] tracking-tight'>
            {t(locale, 'password.sentLine1')}
            <br />
            <span className='text-sage italic'>{t(locale, 'password.sentItalic')}</span>
          </h1>
          <p className='text-ink-faint mt-3 text-sm'>{t(locale, 'password.sentBody')}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className='mt-10'
        >
          <button
            type='button'
            onClick={goBackToAccount}
            className='border-line bg-paper text-ink-soft hover:bg-line/40 flex h-12 w-full items-center justify-center rounded-xl border text-sm transition-all active:scale-[0.98]'
          >
            {t(locale, 'password.backToAccount')}
          </button>
        </motion.div>
      </div>
    )
  }

  if (step === 'confirm-unlink') {
    return (
      <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
        <Header
          onBack={goBackToAccount}
          locale={locale}
        />
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
            onClick={goBackToAccount}
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
    const doneIsUnlinked = isGoogleReason
    return (
      <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
        <Header
          onBack={goBackToAccount}
          locale={locale}
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className='mt-12'
        >
          <h1 className='font-display text-[36px] leading-[0.93] tracking-tight'>
            {t(locale, doneIsUnlinked ? 'password.unlinkDoneTitle' : 'password.doneTitle')}
            <br />
            <span className='text-sage italic'>{t(locale, doneIsUnlinked ? 'password.unlinkDoneTitleItalic' : 'password.doneTitleItalic')}</span>
          </h1>
          <p className='text-ink-faint mt-3 text-sm'>{t(locale, doneIsUnlinked ? 'password.unlinkDoneBody' : 'password.doneBody')}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className='mt-10'
        >
          <button
            type='button'
            onClick={goBackToAccount}
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
      <Header
        onBack={goBackToAccount}
        locale={locale}
      />

      <AnimatePresence mode='wait'>
        {mode === null ?
          <motion.div
            key='skeleton'
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className='mt-12 flex flex-col gap-10'
          >
            <div className='flex flex-col gap-3'>
              <Skel className='h-10 w-48' />
              <Skel className='h-10 w-36' />
              <Skel className='mt-1 h-4 w-56' />
            </div>
            <Skel className='h-12 w-full rounded-xl' />
          </motion.div>
        : <motion.div
            key='content'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className='mt-12'
            >
              <h1 className='font-display text-[36px] leading-[0.93] tracking-tight'>
                {heading.line1}
                <br />
                <span className='text-sage italic'>{heading.italic}</span>
              </h1>
              <p className='text-ink-faint mt-3 text-sm'>{subtitle}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className='mt-10 flex flex-col gap-4'
            >
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
                type='button'
                disabled={pending}
                onClick={handleRequest}
                className='bg-sage text-bg flex h-12 items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50'
              >
                {pending ?
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {t(locale, 'password.requesting')}
                  </motion.span>
                : mode === 'set' ?
                  t(locale, 'password.requestCreateBtn')
                : t(locale, 'password.requestChangeBtn')}
              </button>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </div>
  )
}

function Header({ onBack, locale }: { onBack: () => void; locale: Locale }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className='flex items-center justify-between gap-3'
    >
      <span className='text-ink-faint font-display text-sm italic'>{t(locale, 'auth.header')}</span>
      <button
        type='button'
        onClick={onBack}
        className='border-line bg-paper text-ink-soft hover:bg-line/40 focus-visible:bg-line/40 focus-visible:ring-sage/40 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]'
      >
        <span aria-hidden>←</span>
        <span>{t(locale, 'password.back')}</span>
      </button>
    </motion.header>
  )
}

function headingFor(mode: Mode, isGoogleReason: boolean, locale: Locale) {
  if (mode === 'set' && isGoogleReason) {
    return { line1: t(locale, 'password.googleHeadingLine1'), italic: t(locale, 'password.googleHeadingItalic') }
  }
  if (mode === 'set') {
    return { line1: t(locale, 'password.setHeadingLine1'), italic: t(locale, 'password.setHeadingItalic') }
  }
  return { line1: t(locale, 'password.changeHeadingLine1'), italic: t(locale, 'password.changeHeadingItalic') }
}

function subtitleFor(mode: Mode, isGoogleReason: boolean, locale: Locale) {
  if (mode === 'set' && isGoogleReason) return t(locale, 'password.googleSubtitle')
  if (mode === 'set') return t(locale, 'password.setSubtitle')
  return t(locale, 'password.changeSubtitle')
}
