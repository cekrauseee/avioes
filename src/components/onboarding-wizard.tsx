'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import {
  checkUsernameAvailable,
  finishOnboarding,
  saveOnboardingProfile,
  suggestUsernamesForSignup,
  uploadProfileImage,
  type OnboardingState
} from '../actions'
import { authClient } from '../lib/auth-client'
import { resolveAvatarUrl } from '../lib/avatar'
import { t, tf } from '../lib/i18n'
import { MOTION_OFFSET, MOTION_TRANSITION, withMotionDelay } from '../lib/motion'
import { applyLocalIdentity, applyServerSnapshot, selectLocale, useOfflineState } from '../lib/offline-store'
import { MEMBER_COLORS } from '../lib/types'
import { Avatar } from './avatar'
import { Button } from './button'
import { IconArrowLeft } from './icons'

type Step = 'name' | 'username' | 'photo' | 'group'
type UsernameStatus = 'idle' | 'pending' | 'available' | 'taken' | 'invalid'

const STEPS: Step[] = ['name', 'username', 'photo', 'group']
const USERNAME_RE = /^[a-z0-9_.]{3,24}$/
const USERNAME_DEBOUNCE_MS = 350
const MAX_IMAGE_BYTES = 180_000
const RESIZE_MAX_DIM = 384
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const firstNameSchemaMin = z.string().trim().min(1)
const firstNameSchemaMax = z.string().trim().max(60)
const lastNameSchema = z.string().trim().max(60)

const slideVariants = {
  enter: (dir: number) => ({ x: dir * MOTION_OFFSET.step, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: -dir * MOTION_OFFSET.step, opacity: 0 })
}

export function OnboardingWizard({ initial }: { initial: OnboardingState }) {
  const router = useRouter()
  const state = useOfflineState()
  const locale = selectLocale(state)

  const [step, setStep] = useState<Step>('name')
  const [direction, setDirection] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [firstName, setFirstName] = useState(initial.firstName ?? '')
  const [lastName, setLastName] = useState(initial.lastName ?? '')

  const [suggestions, setSuggestions] = useState<string[]>(initial.suggestedUsernames)
  const [pickedUsername, setPickedUsername] = useState<string | null>(initial.username)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const usernameCheckRef = useRef(0)
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [image, setImage] = useState<string | null>(initial.image)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [savedImage, setSavedImage] = useState<string | null>(initial.image)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [groupName, setGroupName] = useState('')

  useEffect(() => {
    return () => {
      if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current)
    }
  }, [])

  const goTo = (next: Step) => {
    setDirection(STEPS.indexOf(next) >= STEPS.indexOf(step) ? 1 : -1)
    setStep(next)
    setError(null)
  }

  const handleNameNext = (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()
    if (!firstNameSchemaMin.safeParse(trimmedFirst).success) {
      setError(t(locale, 'auth.nameRequired'))
      return
    }
    if (!firstNameSchemaMax.safeParse(trimmedFirst).success) {
      setError(t(locale, 'auth.nameTooLong'))
      return
    }
    if (!lastNameSchema.safeParse(trimmedLast).success) {
      setError(t(locale, 'auth.lastNameTooLong'))
      return
    }
    if (trimmedFirst !== firstName) setFirstName(trimmedFirst)
    if (trimmedLast !== lastName) setLastName(trimmedLast)
    void refreshSuggestions(trimmedFirst)
    goTo('username')
  }

  const refreshSuggestions = async (firstNameForSeed: string) => {
    const res = await suggestUsernamesForSignup(initial.email, firstNameForSeed)
    setSuggestions(res.suggestions)
  }

  const onUsernameInputChange = (raw: string) => {
    const sanitized = raw
      .toLowerCase()
      .replace(/[^a-z0-9_.]/g, '')
      .slice(0, 24)
    setUsernameInput(sanitized)
    setError(null)
    setPickedUsername(null)
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current)
    if (sanitized.length === 0) {
      setUsernameStatus('idle')
      return
    }
    if (!USERNAME_RE.test(sanitized)) {
      setUsernameStatus('invalid')
      return
    }
    setUsernameStatus('pending')
    const myCheck = ++usernameCheckRef.current
    usernameTimerRef.current = setTimeout(async () => {
      const result = await checkUsernameAvailable(sanitized)
      if (myCheck !== usernameCheckRef.current) return
      setUsernameStatus(result)
      if (result === 'available') setPickedUsername(sanitized)
    }, USERNAME_DEBOUNCE_MS)
  }

  const onPickSuggestion = (suggestion: string) => {
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current)
    usernameCheckRef.current++
    setUsernameInput('')
    setUsernameStatus('idle')
    setPickedUsername(suggestion)
    setError(null)
  }

  const handleUsernameNext = async () => {
    if (!pickedUsername) return
    setLoading(true)
    setError(null)
    const res = await saveOnboardingProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim() || null,
      username: pickedUsername,
      image: savedImage
    })
    setLoading(false)
    if (!res.ok) {
      if (res.error === 'username_taken') {
        setUsernameStatus('taken')
        setPickedUsername(null)
        setError(t(locale, 'auth.usernameTakenHint'))
        return
      }
      setError(t(locale, 'auth.genericError'))
      return
    }
    goTo('photo')
  }

  const handlePickFile = () => fileRef.current?.click()

  const handleFile = async (file: File) => {
    setError(null)
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setError(t(locale, 'profile.imageUnsupported'))
      return
    }
    setPhotoUploading(true)
    try {
      const blob = await fileToResizedJpeg(file, RESIZE_MAX_DIM)
      if (blob.size > MAX_IMAGE_BYTES) {
        setError(t(locale, 'profile.imageTooLarge'))
        return
      }
      const formData = new FormData()
      formData.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      const res = await uploadProfileImage(formData)
      if (!res.ok) {
        setError(t(locale, 'profile.errImageUpload'))
        return
      }
      setImage(res.url)
    } catch {
      setError(t(locale, 'profile.imageError'))
    } finally {
      setPhotoUploading(false)
    }
  }

  const handlePhotoNext = async () => {
    if (image === savedImage) {
      goTo('group')
      return
    }
    setLoading(true)
    setError(null)
    const res = await saveOnboardingProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim() || null,
      username: pickedUsername!,
      image
    })
    setLoading(false)
    if (!res.ok) {
      setError(t(locale, 'auth.genericError'))
      return
    }
    setSavedImage(image)
    goTo('group')
  }

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = groupName.trim()
    if (!trimmed) {
      setError(t(locale, 'groups.new.nameRequired'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await finishOnboarding({ groupName: trimmed })
      if (!res.ok) {
        setLoading(false)
        setError(t(locale, 'groups.new.error'))
        return
      }
      applyServerSnapshot(res.snapshot)
      router.replace('/')
    } catch {
      setLoading(false)
      setError(t(locale, 'groups.new.error'))
    }
  }

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
    } finally {
      applyLocalIdentity(null)
      router.replace('/auth')
      router.refresh()
    }
  }

  const stepIndex = STEPS.indexOf(step)
  const onSubmit =
    step === 'name' ? handleNameNext
    : step === 'group' ? handleFinish
    : (e: React.FormEvent) => e.preventDefault()

  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={MOTION_TRANSITION.header}
        className='flex items-center justify-between'
      >
        <span className='text-ink-faint font-display text-sm italic'>{t(locale, 'auth.header')}</span>
        <span className='text-ink-faint text-xs'>{tf(locale, 'onboarding.progress', { n: stepIndex + 1, total: STEPS.length })}</span>
      </motion.header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={withMotionDelay(MOTION_TRANSITION.introEnter, 0.05)}
        className='mt-6 flex items-center justify-center gap-2'
      >
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${i <= stepIndex ? 'bg-sage' : 'bg-line'}`}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withMotionDelay(MOTION_TRANSITION.section, 0.08)}
        className='relative mt-10'
      >
        <AnimatePresence
          mode='wait'
          custom={direction}
          initial={false}
        >
          <motion.div
            key={`heading-${step}`}
            custom={direction}
            variants={slideVariants}
            initial='enter'
            animate='center'
            exit='exit'
            transition={MOTION_TRANSITION.stepSlide}
          >
            <h1 className='font-display text-[36px] leading-[0.95] tracking-tight'>
              {t(locale, `onboarding.title.${step}`)}
              <br />
              <span className='text-sage italic'>{t(locale, `onboarding.italic.${step}`)}</span>
            </h1>
            <p className='text-ink-faint mt-3 text-sm'>{t(locale, `onboarding.subtitle.${step}`)}</p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withMotionDelay(MOTION_TRANSITION.section, 0.15)}
        onSubmit={onSubmit}
        className='mt-10 flex flex-1 flex-col gap-4'
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
            {step === 'name' && (
              <>
                <Field
                  label={t(locale, 'auth.nameLabel')}
                  type='text'
                  value={firstName}
                  onChange={setFirstName}
                  placeholder={t(locale, 'auth.namePlaceholder')}
                  autoFocus
                  autoComplete='given-name'
                />
                <Field
                  label={t(locale, 'auth.lastNameLabel')}
                  type='text'
                  value={lastName}
                  onChange={setLastName}
                  placeholder={t(locale, 'auth.lastNamePlaceholder')}
                  autoComplete='family-name'
                />
              </>
            )}

            {step === 'username' && (
              <>
                <UsernameSuggestions
                  locale={locale}
                  suggestions={suggestions}
                  pickedUsername={pickedUsername}
                  hasInput={usernameInput.length > 0}
                  onPick={onPickSuggestion}
                />
                <UsernameField
                  locale={locale}
                  value={usernameInput}
                  status={usernameStatus}
                  onChange={onUsernameInputChange}
                />
              </>
            )}

            {step === 'photo' && (
              <PhotoStep
                locale={locale}
                image={image}
                firstName={firstName}
                uploading={photoUploading}
                fileRef={fileRef}
                onPickFile={handlePickFile}
                onFile={handleFile}
                onClear={() => setImage(null)}
              />
            )}

            {step === 'group' && (
              <div className='flex flex-col gap-1.5'>
                <label className='text-ink-faint text-xs'>{t(locale, 'groups.new.nameLabel')}</label>
                <input
                  type='text'
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={t(locale, 'groups.new.namePlaceholder')}
                  autoFocus
                  maxLength={60}
                  className='border-line bg-paper text-ink placeholder:text-ink-faint ring-sage/40 w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none focus:ring-2'
                />
              </div>
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

        <div className='mt-auto flex flex-col gap-3 pt-6'>
          {step === 'name' && (
            <Button
              type='submit'
              variant='primary'
              size='md'
              fullWidth
            >
              {t(locale, 'onboarding.next')}
            </Button>
          )}

          {step === 'username' && (
            <Button
              type='button'
              variant='primary'
              size='md'
              fullWidth
              disabled={!pickedUsername || usernameStatus === 'pending'}
              status={loading ? 'pending' : 'idle'}
              pendingLabel={t(locale, 'auth.waiting')}
              onClick={handleUsernameNext}
            >
              {t(locale, 'onboarding.next')}
            </Button>
          )}

          {step === 'photo' && (
            <Button
              type='button'
              variant='primary'
              size='md'
              fullWidth
              disabled={photoUploading}
              status={loading ? 'pending' : 'idle'}
              pendingLabel={t(locale, 'auth.waiting')}
              onClick={handlePhotoNext}
            >
              {image && image !== savedImage ? t(locale, 'onboarding.next') : t(locale, 'onboarding.skip')}
            </Button>
          )}

          {step === 'group' && (
            <Button
              type='submit'
              variant='primary'
              size='md'
              fullWidth
              disabled={!groupName.trim()}
              status={loading ? 'pending' : 'idle'}
              pendingLabel={t(locale, 'groups.new.creating')}
            >
              {t(locale, 'onboarding.finish')}
            </Button>
          )}

          <div className='relative h-11 self-start'>
            <AnimatePresence
              mode='wait'
              initial={false}
            >
              {step === 'name' ?
                <motion.div
                  key='signout'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={MOTION_TRANSITION.inline}
                >
                  <Button
                    type='button'
                    variant='ghost-destructive'
                    size='sm'
                    shape='pill'
                    onClick={handleSignOut}
                  >
                    {t(locale, 'onboarding.signOut')}
                  </Button>
                </motion.div>
              : <motion.div
                  key='back'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={MOTION_TRANSITION.inline}
                >
                  <Button
                    type='button'
                    variant='secondary'
                    size='sm'
                    shape='pill'
                    disabled={loading}
                    onClick={() => goTo(STEPS[stepIndex - 1])}
                    leading={<IconArrowLeft size={16} />}
                  >
                    {t(locale, 'onboarding.back')}
                  </Button>
                </motion.div>
              }
            </AnimatePresence>
          </div>
        </div>
      </motion.form>
    </div>
  )
}

function PhotoStep({
  locale,
  image,
  firstName,
  uploading,
  fileRef,
  onPickFile,
  onFile,
  onClear
}: {
  locale: ReturnType<typeof selectLocale>
  image: string | null
  firstName: string
  uploading: boolean
  fileRef: React.RefObject<HTMLInputElement | null>
  onPickFile: () => void
  onFile: (file: File) => void
  onClear: () => void
}) {
  return (
    <div className='flex flex-col items-center gap-4 py-4'>
      <button
        type='button'
        onClick={onPickFile}
        disabled={uploading}
        className='rounded-full transition-opacity hover:opacity-90 disabled:opacity-60'
        aria-label={t(locale, 'profile.changePhoto')}
      >
        <Avatar
          image={resolveAvatarUrl(image)}
          firstName={firstName || '?'}
          accentBg={MEMBER_COLORS[0].bg}
          size={128}
          initialClassName='font-display text-5xl'
        />
      </button>
      <input
        ref={fileRef}
        type='file'
        accept='image/jpeg,image/png,image/webp,image/gif'
        className='hidden'
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onFile(file)
        }}
      />
      <div className='flex gap-2'>
        <Button
          type='button'
          variant='secondary'
          size='sm'
          shape='pill'
          onClick={onPickFile}
          disabled={uploading}
        >
          {uploading ? t(locale, 'onboarding.uploadingPhoto') : t(locale, 'profile.changePhoto')}
        </Button>
        {image && (
          <Button
            type='button'
            variant='ghost-destructive'
            size='sm'
            shape='pill'
            onClick={onClear}
            disabled={uploading}
          >
            {t(locale, 'profile.removePhoto')}
          </Button>
        )}
      </div>
    </div>
  )
}

function UsernameSuggestions({
  locale,
  suggestions,
  pickedUsername,
  hasInput,
  onPick
}: {
  locale: ReturnType<typeof selectLocale>
  suggestions: string[]
  pickedUsername: string | null
  hasInput: boolean
  onPick: (s: string) => void
}) {
  if (suggestions.length === 0) return null
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-ink-faint text-xs'>{t(locale, 'auth.usernameSuggestionsLabel')}</span>
      <div className='flex flex-wrap gap-2'>
        {suggestions.map((suggestion) => {
          const active = !hasInput && pickedUsername === suggestion
          return (
            <Button
              key={suggestion}
              type='button'
              variant={active ? 'primary' : 'secondary'}
              size='xs'
              shape='pill'
              onClick={() => onPick(suggestion)}
            >
              @{suggestion}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function UsernameField({
  locale,
  value,
  status,
  onChange
}: {
  locale: ReturnType<typeof selectLocale>
  value: string
  status: UsernameStatus
  onChange: (v: string) => void
}) {
  const ringClass =
    status === 'available' ? 'ring-2 ring-sage/40'
    : status === 'taken' || status === 'invalid' ? 'ring-2 ring-clay/40'
    : 'focus-within:ring-2 ring-sage/40'

  const hint =
    status === 'pending' ? t(locale, 'auth.usernameChecking')
    : status === 'available' ? t(locale, 'auth.usernameAvailable')
    : status === 'taken' ? t(locale, 'auth.usernameTakenHint')
    : status === 'invalid' ? t(locale, 'auth.usernameInvalidHint')
    : t(locale, 'auth.usernameHint')

  const hintClass =
    status === 'available' ? 'text-sage'
    : status === 'taken' || status === 'invalid' ? 'text-clay'
    : 'text-ink-faint'

  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-ink-faint text-xs'>{t(locale, 'auth.usernameLabel')}</label>
      <div className={`border-line bg-paper flex items-center rounded-xl border transition-all ${ringClass}`}>
        <span className='text-ink-faint pl-3 text-sm'>@</span>
        <input
          type='text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t(locale, 'auth.usernamePlaceholder')}
          maxLength={24}
          autoComplete='off'
          autoCapitalize='none'
          spellCheck={false}
          className='text-ink placeholder:text-ink-faint w-full bg-transparent py-3 pr-3 pl-2 text-sm outline-none'
        />
      </div>
      <p className={`text-[11px] ${hintClass}`}>{hint}</p>
    </div>
  )
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoFocus,
  autoComplete
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  autoComplete?: string
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-ink-faint text-xs'>{label}</label>
      <input
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

async function fileToResizedJpeg(file: File, maxDim: number): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * ratio)
    const h = Math.round(img.naturalHeight * ratio)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas context')
    ctx.drawImage(img, 0, 0, w, h)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.85)
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
