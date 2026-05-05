'use client'

import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { acceptInvitation, rejectInvitation } from '../actions'
import { t, tf } from '../lib/i18n'
import { applyServerSnapshot, selectLocale, useOfflineState } from '../lib/offline-store'

type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | 'not_found'

type Props = {
  token: string
  status: InviteStatus
  groupName?: string
  invitedByFirstName?: string
  invitedByImage?: string | null
  invitedEmail?: string
  isAuthenticated?: boolean
  userEmail?: string | null
}

type ScreenState = 'viewing' | 'accepting' | 'rejecting' | 'accepted' | 'rejected' | 'error'

export function InviteScreen({
  token,
  status,
  groupName,
  invitedByFirstName,
  invitedByImage,
  invitedEmail,
  isAuthenticated = false,
  userEmail = null
}: Props) {
  const router = useRouter()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const [screenState, setScreenState] = useState<ScreenState>('viewing')
  const [acceptedGroupName, setAcceptedGroupName] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const emailMatch = !invitedEmail || !userEmail || userEmail.toLowerCase() === invitedEmail.toLowerCase()

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
        setScreenState('accepted')
      } else {
        if (result.error === 'email_mismatch') {
          setScreenState('viewing')
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
    <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
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
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
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
            <button
              type='button'
              onClick={() => router.replace('/')}
              className='bg-sage text-bg mt-8 flex h-12 items-center justify-center rounded-xl px-8 text-sm font-medium transition-all active:scale-[0.98]'
            >
              {t(locale, 'invite.acceptedCta')}
            </button>
          </motion.div>
        : screenState === 'rejected' ?
          <motion.div
            key='rejected'
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className='flex flex-1 flex-col items-center justify-center text-center'
          >
            <h1 className='font-display mt-8 text-[34px] leading-[0.95] tracking-tight'>
              {t(locale, 'invite.rejectedLine1')}
              <br />
              <span className='text-sage italic'>{t(locale, 'invite.rejectedItalic')}</span>
            </h1>
            <p className='font-display text-ink-soft mt-3 max-w-[26ch] text-sm italic'>{t(locale, 'invite.rejectedBody')}</p>
            <Link
              href='/'
              className='bg-paper text-ink hover:bg-line/40 mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm transition-colors active:scale-[0.99]'
            >
              <span className='font-display'>{t(locale, 'invite.rejectedCta')}</span>
            </Link>
          </motion.div>
        : <motion.div
            key='viewing'
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
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
                  src={invitedByImage}
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
                <button
                  type='button'
                  onClick={handleAccept}
                  disabled={screenState === 'accepting' || screenState === 'rejecting'}
                  className='bg-sage text-bg flex h-12 items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50'
                >
                  {screenState === 'accepting' ? t(locale, 'invite.accepting') : t(locale, 'invite.accept')}
                </button>
                <button
                  type='button'
                  onClick={handleReject}
                  disabled={screenState === 'accepting' || screenState === 'rejecting'}
                  className='border-line bg-paper text-ink-soft hover:bg-line/40 flex h-12 items-center justify-center rounded-xl border text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50'
                >
                  {screenState === 'rejecting' ? t(locale, 'invite.rejecting') : t(locale, 'invite.reject')}
                </button>
              </div>
            : isAuthenticated && !emailMatch ?
              <div className='flex flex-col gap-3'>
                <p className='text-ink-faint text-center text-sm'>{tf(locale, 'invite.emailMismatch', { email: invitedEmail ?? '' })}</p>
              </div>
            : <div className='flex flex-col gap-3'>
                <button
                  type='button'
                  onClick={() => router.push(`/auth?next=${encodeURIComponent(`/invite/${token}`)}`)}
                  className='bg-sage text-bg flex h-12 items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-[0.98]'
                >
                  {t(locale, 'invite.signIn')}
                </button>
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
    <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
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

      <Link
        href='/'
        className='bg-paper text-ink hover:bg-line/40 focus-visible:bg-line/40 mt-4 inline-flex items-center justify-center gap-2 self-center rounded-full px-5 py-3 text-sm transition-colors active:scale-[0.99]'
      >
        <span
          aria-hidden
          className='text-base leading-none'
        >
          ←
        </span>
        <span className='font-display'>{t(locale, 'invite.backToApp')}</span>
      </Link>
    </main>
  )
}
