'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { requestPasswordChange, requestPasswordCreation } from '../actions'
import { authClient } from '@airplanes/auth/client'
import { t } from '@airplanes/i18n'
import { MOTION_TRANSITION, withMotionDelay } from '../lib/motion'
import { useNavDirection } from '../lib/nav-direction'
import { selectLocale, useOfflineState } from '../lib/offline-store'
import type { Locale } from '@airplanes/types'
import { Button } from './button'
import { IconArrowLeft, IconChevronRight } from './icons'
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
    router.push('/settings?tab=account')
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
          transition={withMotionDelay(MOTION_TRANSITION.section, 0.08)}
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
          transition={withMotionDelay(MOTION_TRANSITION.section, 0.15)}
          className='mt-10'
        >
          <Button
            variant='secondary'
            size='md'
            fullWidth
            onClick={goBackToAccount}
          >
            {t(locale, 'password.backToAccount')}
          </Button>
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
          transition={withMotionDelay(MOTION_TRANSITION.section, 0.08)}
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
          transition={withMotionDelay(MOTION_TRANSITION.section, 0.15)}
          className='mt-10 flex flex-col gap-3'
        >
          <Button
            variant='destructive'
            size='md'
            fullWidth
            status={unlinking ? 'pending' : 'idle'}
            pendingLabel={t(locale, 'password.unlinking')}
            onClick={handleUnlinkGoogle}
          >
            {t(locale, 'password.unlinkButton')}
          </Button>
          <Button
            variant='secondary'
            size='md'
            fullWidth
            onClick={goBackToAccount}
          >
            {t(locale, 'password.unlinkSkip')}
          </Button>
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
          transition={withMotionDelay(MOTION_TRANSITION.section, 0.08)}
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
          transition={withMotionDelay(MOTION_TRANSITION.section, 0.15)}
          className='mt-10'
        >
          <Button
            variant='primary'
            size='md'
            fullWidth
            onClick={goBackToAccount}
            trailing={<IconChevronRight size={14} />}
          >
            {t(locale, 'password.backToAccount')}
          </Button>
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
            transition={MOTION_TRANSITION.token}
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
            transition={MOTION_TRANSITION.route}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={withMotionDelay(MOTION_TRANSITION.section, 0.08)}
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
              transition={withMotionDelay(MOTION_TRANSITION.section, 0.15)}
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

              <Button
                variant='primary'
                size='md'
                fullWidth
                status={pending ? 'pending' : 'idle'}
                pendingLabel={t(locale, 'password.requesting')}
                onClick={handleRequest}
              >
                {mode === 'set' ? t(locale, 'password.requestCreateBtn') : t(locale, 'password.requestChangeBtn')}
              </Button>
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
      transition={MOTION_TRANSITION.header}
      className='flex items-center justify-between gap-3'
    >
      <span className='text-ink-faint font-display text-sm italic'>{t(locale, 'auth.header')}</span>
      <Button
        variant='secondary'
        size='sm'
        shape='pill'
        onClick={onBack}
        leading={<IconArrowLeft size={16} />}
      >
        {t(locale, 'password.back')}
      </Button>
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
