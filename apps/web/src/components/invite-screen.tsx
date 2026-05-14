'use client'

import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { acceptInvitation, rejectInvitation } from '../actions'
import { resolveAvatarUrl } from '../lib/avatar'
import { t, tf } from '@airplanes/i18n'
import { MOTION_TRANSITION, withMotionDelay } from '../lib/motion'
import { applyServerSnapshot, selectLocale, useOfflineState } from '../lib/offline-store'
import { Button, ButtonLink } from './button'
import { IconArrowLeft } from './icons'

type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | 'not_found'

type Props = {
  token: string
  status: InviteStatus
  groupName?: string
  invitedByFirstName?: string
  invitedByImage?: string
  isAuthenticated?: boolean
  emailMatch?: boolean
  emailVerified?: boolean
}

type ScreenState = 'viewing' | 'accepting' | 'rejecting' | 'accepted' | 'rejected' | 'error'

export function InviteScreen({
  token,
  status,
  groupName,
  invitedByFirstName,
  invitedByImage,
  isAuthenticated = false,
  emailMatch = false,
  emailVerified = false
}: Props) {
  const router = useRouter()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const [screenState, setScreenState] = useState<ScreenState>('viewing')
  const [acceptedGroupName, setAcceptedGroupName] = useState<string | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  if (status === 'not_found')
    return (
      <ErrorScreen
        locale={locale}
        line1Key='invite.notFoundLine1'
        italicKey='invite.notFoundItalic'
        bodyKey='invite.notFoundBody'
      />
    )
  if (status === 'expired')
    return (
      <ErrorScreen
        locale={locale}
        line1Key='invite.expiredLine1'
        italicKey='invite.expiredItalic'
        bodyKey='invite.expiredBody'
      />
    )
  if (status === 'cancelled')
    return (
      <ErrorScreen
        locale={locale}
        line1Key='invite.cancelledLine1'
        italicKey='invite.cancelledItalic'
        bodyKey='invite.cancelledBody'
      />
    )
  if (status === 'accepted' || status === 'rejected')
    return (
      <ErrorScreen
        locale={locale}
        line1Key='invite.usedLine1'
        italicKey='invite.usedItalic'
        bodyKey='invite.usedBody'
      />
    )

  const handleAccept = () => {
    setScreenState('accepting')
    setErrorMsg(null)
    startTransition(async () => {
      const result = await acceptInvitation(token)
      if (result.ok) {
        applyServerSnapshot(result.snapshot)
        setAcceptedGroupName(result.groupName)
        setNeedsOnboarding(result.onboardingStatus === 'pending')
        setScreenState('accepted')
      } else {
        if (result.error === 'email_mismatch' || result.error === 'email_not_verified') {
          setScreenState('viewing')
          if (result.error === 'email_not_verified') {
            setErrorMsg(t(locale, 'invite.emailNotVerified'))
          }
        } else {
          setErrorMsg(t(locale, 'invite.error'))
          setScreenState('error')
        }
      }
    })
  }

  const handleReject = () => {
    setScreenState('rejecting')
    setErrorMsg(null)
    startTransition(async () => {
      const result = await rejectInvitation(token)
      if (result.ok) {
        setScreenState('rejected')
      } else {
        setErrorMsg(t(locale, 'invite.error'))
        setScreenState('error')
      }
    })
  }

  return (
    <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)] lg:mx-auto lg:max-w-3xl'>
      <header className='flex items-baseline justify-between'>
        <span className='text-ink-faint text-xs'>{t(locale, 'invite.header')}</span>
      </header>

      <AnimatePresence
        mode='wait'
        initial={false}
      >
        {screenState === 'accepted' ?
          <motion.div
            key='accepted'
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={MOTION_TRANSITION.sectionMedium}
            className='flex flex-1 flex-col items-center justify-center text-center'
          >
            <div className='relative w-[60%] max-w-55'>
              <Image
                src='/invite-accepted-light.png'
                alt=''
                aria-hidden
                width={480}
                height={480}
                unoptimized
                className='theme-light-only h-auto w-full select-none'
                draggable={false}
              />
              <Image
                src='/invite-accepted-dark.png'
                alt=''
                aria-hidden
                width={480}
                height={480}
                unoptimized
                className='theme-dark-only h-auto w-full select-none'
                draggable={false}
              />
            </div>
            <h1 className='font-display mt-8 text-[34px] leading-[0.95] tracking-tight'>
              {t(locale, 'invite.acceptedLine1')}
              <br />
              <span className='text-sage italic'>{t(locale, 'invite.acceptedItalic')}</span>
            </h1>
            <p className='font-display text-ink-soft mt-3 max-w-[26ch] text-sm italic'>
              {tf(locale, 'invite.acceptedBody', { group: acceptedGroupName ?? groupName ?? '' })}
            </p>
            <Button
              variant='primary'
              size='md'
              className='mt-8 px-8'
              onClick={() => router.replace(needsOnboarding ? '/onboarding' : '/')}
            >
              {t(locale, needsOnboarding ? 'invite.acceptedCtaOnboarding' : 'invite.acceptedCta')}
            </Button>
          </motion.div>
        : screenState === 'rejected' ?
          <motion.div
            key='rejected'
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={MOTION_TRANSITION.sectionMedium}
            className='flex flex-1 flex-col items-center justify-center text-center'
          >
            <h1 className='font-display mt-8 text-[34px] leading-[0.95] tracking-tight'>
              {t(locale, 'invite.rejectedLine1')}
              <br />
              <span className='text-sage italic'>{t(locale, 'invite.rejectedItalic')}</span>
            </h1>
            <p className='font-display text-ink-soft mt-3 max-w-[26ch] text-sm italic'>{t(locale, 'invite.rejectedBody')}</p>
            <ButtonLink
              href='/'
              variant='secondary'
              size='sm'
              shape='pill'
              className='font-display mt-8'
            >
              {t(locale, 'invite.rejectedCta')}
            </ButtonLink>
          </motion.div>
        : <motion.div
            key='viewing'
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={withMotionDelay(MOTION_TRANSITION.section, 0.08)}
            className='mt-12 flex flex-1 flex-col'
          >
            <h1 className='font-display text-[38px] leading-[0.92] tracking-tight'>
              {t(locale, 'invite.titleLine1')}
              <br />
              <span className='text-sage italic'>{t(locale, 'invite.titleItalic')}</span>
            </h1>

            <div className='mt-6 flex items-center gap-3'>
              {invitedByImage ?
                <Image
                  src={resolveAvatarUrl(invitedByImage) ?? invitedByImage}
                  alt=''
                  width={40}
                  height={40}
                  unoptimized
                  referrerPolicy='no-referrer'
                  className='h-10 w-10 rounded-full object-cover'
                />
              : <div className='bg-sage text-bg flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium'>
                  {invitedByFirstName?.[0]?.toUpperCase() ?? '?'}
                </div>
              }
              <div>
                <p className='text-ink text-sm font-medium'>{tf(locale, 'invite.invitedBy', { name: invitedByFirstName ?? '' })}</p>
                <p className='text-ink-faint text-xs'>{groupName}</p>
              </div>
            </div>

            <div className='relative mx-auto my-auto w-[60%] max-w-55'>
              <Image
                src='/invite-hero-light.png'
                alt=''
                aria-hidden
                width={480}
                height={480}
                unoptimized
                className='theme-light-only h-auto w-full select-none'
                draggable={false}
              />
              <Image
                src='/invite-hero-dark.png'
                alt=''
                aria-hidden
                width={480}
                height={480}
                unoptimized
                className='theme-dark-only h-auto w-full select-none'
                draggable={false}
              />
            </div>

            {errorMsg && <p className='text-clay mb-3 text-center text-sm'>{errorMsg}</p>}

            {isAuthenticated && emailMatch ?
              <div className='flex flex-col gap-3'>
                {!emailVerified && <p className='text-clay text-center text-sm'>{t(locale, 'invite.emailNotVerified')}</p>}
                <Button
                  variant='primary'
                  size='md'
                  fullWidth
                  disabled={screenState === 'rejecting'}
                  status={screenState === 'accepting' ? 'pending' : 'idle'}
                  pendingLabel={t(locale, 'invite.accepting')}
                  onClick={handleAccept}
                >
                  {t(locale, 'invite.accept')}
                </Button>
                <Button
                  variant='secondary'
                  size='md'
                  fullWidth
                  disabled={screenState === 'accepting'}
                  status={screenState === 'rejecting' ? 'pending' : 'idle'}
                  pendingLabel={t(locale, 'invite.rejecting')}
                  onClick={handleReject}
                >
                  {t(locale, 'invite.reject')}
                </Button>
              </div>
            : isAuthenticated && !emailMatch ?
              <div className='flex flex-col gap-3'>
                <p className='text-ink-faint text-center text-sm'>{t(locale, 'invite.emailMismatch')}</p>
              </div>
            : <div className='flex flex-col gap-3'>
                <Button
                  variant='primary'
                  size='md'
                  fullWidth
                  onClick={() => router.push(`/auth?next=${encodeURIComponent(`/invite/${token}`)}`)}
                >
                  {t(locale, 'invite.signIn')}
                </Button>
              </div>
            }
          </motion.div>
        }
      </AnimatePresence>
    </main>
  )
}

function ErrorScreen({ locale, line1Key, italicKey, bodyKey }: { locale: 'pt' | 'en'; line1Key: string; italicKey: string; bodyKey: string }) {
  return (
    <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)] lg:mx-auto lg:max-w-3xl'>
      <header className='flex items-baseline justify-between'>
        <span className='text-ink-faint text-xs'>{t(locale, 'invite.header')}</span>
      </header>

      <div className='flex flex-1 flex-col items-center justify-center text-center'>
        <div className='relative w-[60%] max-w-55'>
          <Image
            src='/airplane-not-found-light.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            unoptimized
            className='theme-light-only h-auto w-full select-none'
            draggable={false}
          />
          <Image
            src='/airplane-not-found-dark.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            unoptimized
            className='theme-dark-only h-auto w-full select-none'
            draggable={false}
          />
        </div>
        <h1 className='font-display mt-8 text-[34px] leading-[0.95] tracking-tight'>
          {t(locale, line1Key as Parameters<typeof t>[1])} <span className='text-clay italic'>{t(locale, italicKey as Parameters<typeof t>[1])}</span>
        </h1>
        <p className='font-display text-ink-soft mt-3 max-w-[26ch] text-sm italic'>{t(locale, bodyKey as Parameters<typeof t>[1])}</p>
      </div>

      <ButtonLink
        href='/'
        variant='secondary'
        size='sm'
        shape='pill'
        className='font-display mt-4 self-center'
        leading={<IconArrowLeft size={16} />}
      >
        {t(locale, 'invite.backToApp')}
      </ButtonLink>
    </main>
  )
}
