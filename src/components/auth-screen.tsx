'use client'

import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getEmailAuthState, requestOtpEmail, requestPasswordCreationForEmail } from '../actions'
import { DATE_LOCALE, t, tf } from '../lib/i18n'
import { MOTION_OFFSET, MOTION_TRANSITION } from '../lib/motion'
import { applyLocalIdentity, selectLocale, useOfflineState } from '../lib/offline-store'
import { OTP_ALLOWED_ATTEMPTS, OTP_LENGTH } from '../lib/otp-constants'
import { Button } from './button'

type Step = 'welcome' | 'email' | 'method' | 'password' | 'otp' | 'no-password' | 'error'

const STEP_ORDER: Record<Step, number> = { welcome: 0, error: 0, email: 1, method: 2, password: 3, otp: 3, 'no-password': 3 }

const RESEND_COOLDOWN_MS = 30 * 1000
const timestamp: () => number = Date.now

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function getAuthClient() {
  return (await import('../lib/auth-client')).authClient
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir * MOTION_OFFSET.step, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: -dir * MOTION_OFFSET.step, opacity: 0 })
}

const screenVariants = {
  enter: (dir: number) => ({ x: dir * MOTION_OFFSET.screen, opacity: 0, filter: 'blur(3px)' }),
  center: { x: 0, opacity: 1, filter: 'blur(0px)' },
  exit: (dir: number) => ({ x: -dir * MOTION_OFFSET.screen, opacity: 0, filter: 'blur(2px)', transition: MOTION_TRANSITION.screenExit })
}

export function AuthScreen({ nextPath, oauthError }: { nextPath: string; oauthError: string | null }) {
  const router = useRouter()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const isInviteFlow = nextPath.startsWith('/invite/')
  const [step, setStep] = useState<Step>(oauthError ? 'error' : 'welcome')
  const [direction, setDirection] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountExists, setAccountExists] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpExhausted, setOtpExhausted] = useState(false)
  const [otpAttemptsUsed, setOtpAttemptsUsed] = useState(0)
  const [resendAt, setResendAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [noPasswordSent, setNoPasswordSent] = useState(false)
  const [noPasswordLoading, setNoPasswordLoading] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [hasPasskey, setHasPasskey] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)

  useEffect(() => {
    if (resendAt === null) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [resendAt])

  const resendSecondsLeft = resendAt === null ? 0 : Math.max(0, Math.ceil((resendAt - now) / 1000))

  useEffect(() => {
    applyLocalIdentity(null)
  }, [])

  useEffect(() => {
    if (!oauthError) return
    const cleaned = nextPath === '/' ? '/auth' : `/auth?next=${encodeURIComponent(nextPath)}`
    router.replace(cleaned, { scroll: false })
  }, [oauthError, nextPath, router])

  const errorRedirectURL = nextPath === '/' ? '/auth' : `/auth?next=${encodeURIComponent(nextPath)}`

  const handleGoogle = async () => {
    setError(null)
    setLoading(true)
    const authClient = await getAuthClient()
    const result = await authClient.signIn.social({
      provider: 'google',
      callbackURL: nextPath,
      errorCallbackURL: errorRedirectURL
    })
    if (result.error) {
      setLoading(false)
      advanceTo('error')
    }
  }

  const advanceTo = (next: Step) => {
    setDirection(STEP_ORDER[next] >= STEP_ORDER[step] ? 1 : -1)
    setStep(next)
  }

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (!EMAIL_RE.test(normalized)) {
      setError(t(locale, 'auth.invalidEmail'))
      return
    }
    setLoading(true)
    setError(null)
    const { exists, hasPassword: hp, hasPasskey: pk } = await getEmailAuthState(normalized)
    setAccountExists(exists)
    setHasPassword(hp)
    setHasPasskey(pk)
    setLoading(false)
    advanceTo(exists ? 'method' : 'password')
  }

  const sendOtp = async (): Promise<boolean> => {
    setOtpSending(true)
    setError(null)
    const result = await requestOtpEmail(email.trim().toLowerCase())
    setOtpSending(false)
    if (!result.ok) {
      setError(t(locale, 'auth.otpSendFailed'))
      return false
    }
    setOtpAttemptsUsed(0)
    setOtpExhausted(false)
    const stamp = timestamp()
    setNow(stamp)
    setResendAt(stamp + RESEND_COOLDOWN_MS)
    return true
  }

  const chooseOtp = async () => {
    setOtp('')
    setOtpAttemptsUsed(0)
    setOtpExhausted(false)
    advanceTo('otp')
    await sendOtp()
  }

  const handleResend = async () => {
    if (resendSecondsLeft > 0 && !otpExhausted) return
    setOtp('')
    await sendOtp()
  }

  const verifyOtp = async (otpCode: string) => {
    setLoading(true)
    setError(null)
    const authClient = await getAuthClient()
    const result = await authClient.signIn.emailOtp({
      email: email.trim().toLowerCase(),
      otp: otpCode
    })
    setLoading(false)
    if (result.error) {
      const code = result.error.code
      setOtp('')
      if (code === 'TOO_MANY_ATTEMPTS') {
        setOtpAttemptsUsed(OTP_ALLOWED_ATTEMPTS)
        setOtpExhausted(true)
        setResendAt(null)
        setError(t(locale, 'auth.otpExhausted'))
        return
      }
      if (code === 'OTP_EXPIRED') {
        setOtpExhausted(true)
        setResendAt(null)
        setError(t(locale, 'auth.otpExpired'))
        return
      }
      const used = otpAttemptsUsed + 1
      setOtpAttemptsUsed(used)
      const remaining = Math.max(0, OTP_ALLOWED_ATTEMPTS - used)
      if (remaining <= 0) {
        setOtpExhausted(true)
        setResendAt(null)
        setError(t(locale, 'auth.otpExhausted'))
      } else if (remaining === 1) {
        setError(t(locale, 'auth.otpWrong1'))
      } else {
        setError(tf(locale, 'auth.otpWrongN', { n: remaining }))
      }
      return
    }
    router.replace(nextPath)
    router.refresh()
  }

  const handlePasskeySignIn = async () => {
    setPasskeyLoading(true)
    setError(null)
    const authClient = await getAuthClient()
    const result = await authClient.signIn.passkey()
    setPasskeyLoading(false)
    if (!result?.error) {
      router.replace(nextPath)
      router.refresh()
      return
    }
    const code = 'code' in result.error ? result.error.code : undefined
    if (code === 'AUTH_CANCELLED') return
    if (code === 'PASSKEY_NOT_FOUND') {
      setError(t(locale, 'auth.passkeyNotFound'))
      return
    }
    setError(t(locale, 'auth.passkeyFailed'))
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpExhausted) return
    if (otp.length !== OTP_LENGTH) {
      setError(tf(locale, 'auth.otpEnterDigits', { n: OTP_LENGTH }))
      return
    }
    await verifyOtp(otp)
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError(t(locale, 'auth.passwordRequired'))
      return
    }

    if (accountExists) {
      setLoading(true)
      setError(null)
      const authClient = await getAuthClient()
      const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password })
      setLoading(false)
      if (result.error) {
        if (result.error.status === 401 || result.error.status === 400) {
          setError(t(locale, 'auth.wrongPassword'))
        } else {
          setError(t(locale, 'auth.genericError'))
        }
        return
      }
      router.replace(nextPath)
      router.refresh()
      return
    }

    if (password.length < 8) {
      setError(t(locale, 'auth.passwordTooShort'))
      return
    }
    if (password.length > 128) {
      setError(t(locale, 'auth.passwordTooLong'))
      return
    }

    setLoading(true)
    setError(null)
    const authClient = await getAuthClient()
    const result = await authClient.signUp.email({
      email: email.trim().toLowerCase(),
      password,
      name: t(locale, 'auth.namePlaceholderName')
    })

    if (!result.error) {
      router.replace(nextPath)
      router.refresh()
      return
    }

    setLoading(false)
    if (result.error.status === 422 || result.error.status === 409) {
      setAccountExists(true)
      setError(t(locale, 'auth.accountExists'))
      return
    }
    setError(t(locale, 'auth.genericError'))
  }

  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
      {/* Header */}
      <motion.header
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={MOTION_TRANSITION.header}
        className='flex items-baseline justify-between'
      >
        <span className='text-ink-faint font-display text-sm italic'>{t(locale, 'auth.header')}</span>
        <span className='text-ink-faint text-xs'>
          {new Intl.DateTimeFormat(DATE_LOCALE[locale], { day: '2-digit', month: 'short' }).format(new Date())}
        </span>
      </motion.header>

      {/* Body — error screen, welcome screen, or auth form */}
      <AnimatePresence
        mode='wait'
        custom={direction}
        initial={false}
      >
        {step === 'error' ?
          <motion.div
            key='error'
            custom={direction}
            variants={screenVariants}
            initial='enter'
            animate='center'
            exit='exit'
            transition={MOTION_TRANSITION.screen}
            className='mt-12 flex flex-1 flex-col'
          >
            <h1 className='font-display text-[38px] leading-[0.92] tracking-tight'>
              {t(locale, 'auth.errorLine1')}
              <br />
              <span className='text-clay italic'>{t(locale, 'auth.errorItalic')}</span>
            </h1>
            <p className='text-ink-faint mt-3 text-sm'>{t(locale, 'auth.errorBody')}</p>

            <div className='relative mx-auto my-auto w-[60%] max-w-55'>
              <Image
                src='/airplane-error-light.png'
                alt=''
                aria-hidden
                width={480}
                height={480}
                sizes='220px'
                loading='eager'
                fetchPriority='high'
                className='theme-light-only h-auto w-full select-none'
                draggable={false}
              />
              <Image
                src='/airplane-error-dark.png'
                alt=''
                aria-hidden
                width={480}
                height={480}
                sizes='220px'
                loading='eager'
                fetchPriority='high'
                className='theme-dark-only h-auto w-full select-none'
                draggable={false}
              />
            </div>

            <div className='flex flex-col gap-3'>
              <Button
                variant='secondary'
                size='md'
                fullWidth
                onClick={handleGoogle}
                disabled={loading}
                leading={<GoogleMark />}
              >
                {t(locale, 'auth.tryGoogle')}
              </Button>
              <Button
                variant='primary'
                size='md'
                fullWidth
                onClick={() => advanceTo('email')}
              >
                {t(locale, 'auth.continueEmail')}
              </Button>
              <Button
                variant='secondary'
                size='sm'
                shape='pill'
                className='self-start'
                onClick={() => advanceTo('welcome')}
                leading={<span aria-hidden>←</span>}
              >
                {t(locale, 'auth.back')}
              </Button>
            </div>
          </motion.div>
        : step === 'welcome' ?
          <motion.div
            key='welcome'
            custom={direction}
            variants={screenVariants}
            initial='enter'
            animate='center'
            exit='exit'
            transition={MOTION_TRANSITION.screen}
            className='mt-12 flex flex-1 flex-col'
          >
            <h1 className='font-display text-[38px] leading-[0.92] tracking-tight'>
              {t(locale, isInviteFlow ? 'auth.inviteWelcomeLine1' : 'auth.welcomeLine1')}
              <br />
              <span className='text-sage italic'>{t(locale, isInviteFlow ? 'auth.inviteWelcomeItalic' : 'auth.welcomeItalic')}</span>
            </h1>
            <p className='text-ink-faint mt-3 text-sm'>{t(locale, isInviteFlow ? 'auth.inviteWelcomeBody' : 'auth.welcomeBody')}</p>

            <div className='relative mx-auto my-auto w-[82%] max-w-72'>
              <Image
                src={isInviteFlow ? '/invite-hero-light.png' : '/onboarding-hero-light.png'}
                alt=''
                aria-hidden
                width={1254}
                height={1254}
                sizes='(max-width: 420px) 82vw, 288px'
                loading='eager'
                fetchPriority='high'
                className='theme-light-only h-auto w-full select-none'
                draggable={false}
              />
              <Image
                src={isInviteFlow ? '/invite-hero-dark.png' : '/onboarding-hero-dark.png'}
                alt=''
                aria-hidden
                width={1254}
                height={1254}
                sizes='(max-width: 420px) 82vw, 288px'
                loading='eager'
                fetchPriority='high'
                className='theme-dark-only h-auto w-full select-none'
                draggable={false}
              />
            </div>

            <div className='flex flex-col gap-3'>
              <Button
                variant='secondary'
                size='md'
                fullWidth
                onClick={handleGoogle}
                disabled={loading}
                leading={<GoogleMark />}
              >
                {t(locale, 'auth.continueGoogle')}
              </Button>
              <Button
                variant='primary'
                size='md'
                fullWidth
                onClick={() => advanceTo('email')}
              >
                {t(locale, 'auth.continueEmail')}
              </Button>
            </div>
          </motion.div>
        : <motion.div
            key='form'
            custom={direction}
            variants={screenVariants}
            initial='enter'
            animate='center'
            exit='exit'
            transition={MOTION_TRANSITION.screen}
            className='mt-12 flex flex-1 flex-col'
          >
            <div className='relative'>
              <AnimatePresence
                mode='wait'
                custom={direction}
                initial={false}
              >
                <motion.div
                  key={`heading-${step}-${accountExists ?? 'pending'}`}
                  custom={direction}
                  variants={slideVariants}
                  initial='enter'
                  animate='center'
                  exit='exit'
                  transition={MOTION_TRANSITION.stepSlide}
                >
                  <h1 className='font-display text-[38px] leading-[0.92] tracking-tight'>
                    {step === 'method' ?
                      <>
                        {t(locale, 'auth.welcomeBackLine1')}
                        <br />
                        <span className='text-sage italic'>{t(locale, 'auth.welcomeBackItalic')}</span>
                      </>
                    : step === 'otp' ?
                      <>
                        {t(locale, 'auth.otpLine1')}
                        <br />
                        <span className='text-sage italic'>{t(locale, 'auth.otpItalic')}</span>
                      </>
                    : step === 'password' && accountExists ?
                      <>
                        {t(locale, 'auth.welcomeBackLine1')}
                        <br />
                        <span className='text-sage italic'>{t(locale, 'auth.welcomeBackItalic')}</span>
                      </>
                    : step === 'no-password' ?
                      <>
                        {t(locale, 'auth.noPasswordLine1')}
                        <br />
                        <span className='text-clay italic'>{t(locale, 'auth.noPasswordItalic')}</span>
                      </>
                    : step === 'password' && accountExists === false ?
                      <>
                        {t(locale, 'auth.signupLine1')}
                        <br />
                        <span className='text-sage italic'>{t(locale, 'auth.signupItalic')}</span>
                      </>
                    : <>
                        {t(locale, 'auth.title')}
                        <br />
                        <span className='text-sage italic'>{t(locale, 'auth.titleItalic')}</span>
                      </>
                    }
                  </h1>
                  <p className='text-ink-faint mt-3 truncate text-sm'>
                    {step === 'email' && t(locale, 'auth.emailSubtitle')}
                    {step === 'method' && email}
                    {step === 'otp' && tf(locale, 'auth.otpSentTo', { email })}
                    {step === 'password' && email}
                    {step === 'no-password' && t(locale, 'auth.noPasswordBody')}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <form
              onSubmit={
                step === 'email' ? submitEmail
                : step === 'otp' ?
                  handleOtpSubmit
                : step === 'method' || step === 'no-password' ?
                  (e) => e.preventDefault()
                : handlePassword
              }
              className='mt-10 flex flex-col gap-4'
            >
              <AnimatePresence
                mode='wait'
                custom={direction}
                initial={false}
              >
                <motion.div
                  key={`fields-${step}`}
                  custom={direction}
                  variants={slideVariants}
                  initial='enter'
                  animate='center'
                  exit='exit'
                  transition={MOTION_TRANSITION.stepSlide}
                  className='flex flex-col gap-4'
                >
                  {step === 'email' && (
                    <>
                      <Field
                        label={t(locale, 'auth.emailLabel')}
                        type='text'
                        value={email}
                        onChange={setEmail}
                        placeholder={t(locale, 'auth.emailPlaceholder')}
                        autoFocus
                        autoComplete='email'
                      />
                      <Button
                        variant='secondary'
                        size='sm'
                        shape='pill'
                        className='self-start'
                        onClick={() => {
                          advanceTo('welcome')
                          setError(null)
                        }}
                        leading={<span aria-hidden>←</span>}
                      >
                        {t(locale, 'auth.back')}
                      </Button>
                    </>
                  )}

                  {step === 'password' && (
                    <>
                      <Field
                        label={accountExists === false ? t(locale, 'auth.createPassword') : t(locale, 'auth.passwordLabel')}
                        type='password'
                        value={password}
                        onChange={setPassword}
                        placeholder={t(locale, 'auth.passwordPlaceholder')}
                        autoFocus
                        autoComplete={accountExists ? 'current-password' : 'new-password'}
                      />
                      <Button
                        variant='secondary'
                        size='sm'
                        shape='pill'
                        className='self-start'
                        onClick={() => {
                          setError(null)
                          setPassword('')
                          if (accountExists) {
                            advanceTo('method')
                          } else {
                            setAccountExists(null)
                            advanceTo('email')
                          }
                        }}
                        leading={<span aria-hidden>←</span>}
                      >
                        {accountExists ? t(locale, 'auth.back') : t(locale, 'auth.changeEmail')}
                      </Button>
                    </>
                  )}

                  {step === 'method' && (
                    <>
                      {hasPasskey && (
                        <Button
                          variant='primary'
                          size='md'
                          fullWidth
                          onClick={handlePasskeySignIn}
                          status={passkeyLoading ? 'pending' : 'idle'}
                          pendingLabel={t(locale, 'auth.waiting')}
                        >
                          {t(locale, 'auth.continuePasskey')}
                        </Button>
                      )}
                      <Button
                        variant={hasPasskey ? 'secondary' : 'primary'}
                        size='md'
                        fullWidth
                        onClick={chooseOtp}
                        status={otpSending ? 'pending' : 'idle'}
                        pendingLabel={t(locale, 'auth.sendingOtp')}
                      >
                        {t(locale, 'auth.sendOtpEmail')}
                      </Button>
                      <Button
                        variant='secondary'
                        size='md'
                        fullWidth
                        onClick={() => {
                          setError(null)
                          advanceTo(hasPassword ? 'password' : 'no-password')
                        }}
                      >
                        {t(locale, 'auth.continuePassword')}
                      </Button>
                      <Button
                        variant='secondary'
                        size='sm'
                        shape='pill'
                        className='self-start'
                        onClick={() => {
                          setError(null)
                          setAccountExists(null)
                          setHasPasskey(false)
                          setHasPassword(false)
                          advanceTo('email')
                        }}
                        leading={<span aria-hidden>←</span>}
                      >
                        {t(locale, 'auth.changeEmail')}
                      </Button>
                    </>
                  )}

                  {step === 'otp' && (
                    <>
                      <div className='flex flex-col gap-1.5'>
                        <label className='text-ink-faint text-xs'>{tf(locale, 'auth.otpFieldLabel', { n: OTP_LENGTH })}</label>
                        <input
                          type='text'
                          inputMode='numeric'
                          autoComplete='one-time-code'
                          pattern='[0-9]*'
                          maxLength={OTP_LENGTH}
                          value={otp}
                          disabled={otpExhausted}
                          onChange={(e) => {
                            const next = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH)
                            setOtp(next)
                            if (error) setError(null)
                            if (next.length === OTP_LENGTH && !loading && !otpExhausted) verifyOtp(next)
                          }}
                          autoFocus
                          placeholder='••••••'
                          className='border-line bg-paper text-ink placeholder:text-ink-faint ring-sage/40 w-full rounded-xl border px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] transition-all outline-none focus:ring-2 disabled:opacity-50'
                        />
                      </div>
                      <Button
                        variant='secondary'
                        size='sm'
                        shape='pill'
                        className='self-start'
                        onClick={handleResend}
                        disabled={(resendSecondsLeft > 0 && !otpExhausted) || otpSending}
                      >
                        {otpSending ?
                          t(locale, 'auth.sending')
                        : otpExhausted ?
                          t(locale, 'auth.otpRequestNew')
                        : resendSecondsLeft > 0 ?
                          tf(locale, 'auth.otpResendIn', { n: resendSecondsLeft })
                        : t(locale, 'auth.otpResend')}
                      </Button>
                      <Button
                        variant='secondary'
                        size='sm'
                        shape='pill'
                        className='self-start'
                        onClick={() => {
                          setError(null)
                          setOtp('')
                          setResendAt(null)
                          setOtpAttemptsUsed(0)
                          setOtpExhausted(false)
                          advanceTo('method')
                        }}
                        leading={<span aria-hidden>←</span>}
                      >
                        {t(locale, 'auth.back')}
                      </Button>
                    </>
                  )}

                  {step === 'no-password' && (
                    <>
                      {noPasswordSent ?
                        <p className='text-sage text-sm font-medium'>{t(locale, 'auth.noPasswordSent')}</p>
                      : <Button
                          variant='primary'
                          size='md'
                          fullWidth
                          status={noPasswordLoading ? 'pending' : 'idle'}
                          pendingLabel={t(locale, 'auth.noPasswordSending')}
                          onClick={async () => {
                            setNoPasswordLoading(true)
                            setError(null)
                            const res = await requestPasswordCreationForEmail(email.trim().toLowerCase())
                            setNoPasswordLoading(false)
                            if (!res.ok) {
                              setError(t(locale, 'auth.noPasswordError'))
                              return
                            }
                            setNoPasswordSent(true)
                          }}
                        >
                          {t(locale, 'auth.noPasswordCta')}
                        </Button>
                      }
                      <Button
                        variant='secondary'
                        size='sm'
                        shape='pill'
                        className='self-start'
                        onClick={() => {
                          setError(null)
                          setNoPasswordSent(false)
                          advanceTo('method')
                        }}
                        leading={<span aria-hidden>←</span>}
                      >
                        {t(locale, 'auth.back')}
                      </Button>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <AnimatePresence
                mode='wait'
                initial={false}
              >
                {error && (
                  <motion.p
                    key={error}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={MOTION_TRANSITION.inline}
                    className='text-clay text-sm'
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <AnimatePresence
                mode='wait'
                custom={direction}
                initial={false}
              >
                {step !== 'method' && step !== 'no-password' && (
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={slideVariants}
                    initial='enter'
                    animate='center'
                    exit='exit'
                    transition={MOTION_TRANSITION.stepSlide}
                  >
                    <Button
                      type='submit'
                      variant='primary'
                      size='md'
                      fullWidth
                      className='mt-2'
                      disabled={step === 'otp' && otpExhausted}
                      status={loading ? 'pending' : 'idle'}
                      pendingLabel={
                        step === 'otp' ? t(locale, 'auth.verifying')
                        : step === 'password' && accountExists ?
                          t(locale, 'auth.loading')
                        : step === 'password' && accountExists === false ?
                          t(locale, 'auth.creatingAccount')
                        : t(locale, 'auth.waiting')
                      }
                    >
                      {step === 'email' ?
                        t(locale, 'auth.submitContinue')
                      : step === 'otp' ?
                        t(locale, 'auth.submitSignIn')
                      : accountExists ?
                        t(locale, 'auth.submitSignIn')
                      : t(locale, 'auth.submitCreate')}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </motion.div>
        }
      </AnimatePresence>
    </div>
  )
}

export function GoogleMark() {
  return (
    <svg
      width='18'
      height='18'
      viewBox='0 0 18 18'
      aria-hidden
      className='shrink-0'
    >
      <path
        d='M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z'
        fill='#4285F4'
      />
      <path
        d='M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.806.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5832-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z'
        fill='#34A853'
      />
      <path
        d='M3.9641 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9641 10.71z'
        fill='#FBBC05'
      />
      <path
        d='M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z'
        fill='#EA4335'
      />
    </svg>
  )
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoFocus,
  autoComplete,
  ref
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  autoComplete?: string
  ref?: React.Ref<HTMLInputElement>
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-ink-faint text-xs'>{label}</label>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        className='border-line bg-paper text-ink placeholder:text-ink-faint ring-sage/40 w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none focus:ring-2'
      />
    </div>
  )
}
