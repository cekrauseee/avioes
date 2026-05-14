'use client'

import { t } from '@airplanes/i18n'
import type { Locale } from '@airplanes/types'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { consumePasswordChangeToken } from '../actions'
import { MOTION_TRANSITION, withMotionDelay } from '../lib/motion'
import { useNavDirection } from '../lib/nav-direction'
import { selectLocale, useOfflineState } from '../lib/offline-store'
import { Button } from './button'
import { IconArrowLeft, IconChevronRight } from './icons'
import { PasswordInput } from './password-input'

export function PasswordChangeVerifyScreen({ token, valid, unauthorized }: { token: string; valid: boolean; unauthorized: boolean }) {
  const router = useRouter()
  const { set: setNavDirection } = useNavDirection()
  const state = useOfflineState()
  const locale = selectLocale(state)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)

  const goBackToAccount = () => {
    setNavDirection(-1)
    router.push('/settings?tab=account')
  }

  if (unauthorized) {
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
            {t(locale, 'password.unauthorizedLine1')}
            <br />
            <span className='text-clay italic'>{t(locale, 'password.unauthorizedItalic')}</span>
          </h1>
          <p className='text-ink-faint mt-3 text-sm'>{t(locale, 'password.unauthorizedBody')}</p>
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

  if (!valid) {
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
            {t(locale, 'password.expiredLine1')}
            <br />
            <span className='text-clay italic'>{t(locale, 'password.expiredItalic')}</span>
          </h1>
          <p className='text-ink-faint mt-3 text-sm'>{t(locale, 'password.expiredBody')}</p>
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

  if (done) {
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
            {t(locale, 'password.doneTitle')}
            <br />
            <span className='text-sage italic'>{t(locale, 'password.doneTitleItalic')}</span>
          </h1>
          <p className='text-ink-faint mt-3 text-sm'>{t(locale, 'password.doneBody')}</p>
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
      const res = await consumePasswordChangeToken(token, currentPassword, newPassword)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setDone(true)
    })
  }

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
          {t(locale, 'password.changeHeadingLine1')}
          <br />
          <span className='text-sage italic'>{t(locale, 'password.changeHeadingItalic')}</span>
        </h1>
        <p className='text-ink-faint mt-3 text-sm'>{t(locale, 'password.changeSubtitle')}</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withMotionDelay(MOTION_TRANSITION.section, 0.15)}
        onSubmit={handleSubmit}
        className='mt-10 flex flex-col gap-4'
      >
        <div className='flex flex-col gap-1.5'>
          <label className='text-ink-faint text-xs'>{t(locale, 'password.currentLabel')}</label>
          <PasswordInput
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder='••••••••'
            autoComplete='current-password'
            autoFocus
            locale={locale}
          />
        </div>

        <div className='flex flex-col gap-1.5'>
          <label className='text-ink-faint text-xs'>{t(locale, 'password.newLabel')}</label>
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            placeholder='••••••••'
            autoComplete='new-password'
            locale={locale}
          />
        </div>
        <div className='flex flex-col gap-1.5'>
          <label className='text-ink-faint text-xs'>{t(locale, 'password.confirmLabel')}</label>
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder='••••••••'
            autoComplete='new-password'
            locale={locale}
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

        <Button
          type='submit'
          variant='primary'
          size='md'
          fullWidth
          className='mt-2'
          status={pending ? 'pending' : 'idle'}
          pendingLabel={t(locale, 'password.saving')}
        >
          {t(locale, 'password.changeButton')}
        </Button>
      </motion.form>
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
