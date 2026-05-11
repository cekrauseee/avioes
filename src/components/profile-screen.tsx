'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getMyProfile, updateMyProfile, uploadProfileImage, type ProfileUpdate } from '../actions'
import { resolveAvatarUrl } from '../lib/avatar'
import { getSortedCountries } from '../lib/countries'
import { t, type TKey } from '../lib/i18n'
import { MOTION_TRANSITION, withMotionDelay } from '../lib/motion'
import { useNavDirection } from '../lib/nav-direction'
import { applyActiveGroup, selectLocale, useOfflineState } from '../lib/offline-store'
import { getMemberColor, type Locale } from '../lib/types'
import { Avatar } from './avatar'
import { Button, usePromiseStatus } from './button'
import { IconArrowLeft, IconChevronDown } from './icons'
import { Skel } from './skeleton'

type Profile = {
  firstName: string
  lastName: string
  username: string
  image: string | null
  country: string
  city: string
}

type ErrorField = 'firstName' | 'lastName' | 'username' | 'country' | 'image' | 'general'
type FormError = { field: ErrorField; message: string }

const MAX_IMAGE_BYTES = 180_000
const RESIZE_MAX_DIM = 384
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/gif'

export function ProfileScreen() {
  const router = useRouter()
  const { set: setNavDirection } = useNavDirection()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const who = state.identity ?? ''
  const accent = getMemberColor(who, state.groupMembers)
  const countries = useMemo(() => getSortedCountries(locale), [locale])

  const [loaded, setLoaded] = useState(false)
  const [original, setOriginal] = useState<Profile | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<FormError | null>(null)
  const save = usePromiseStatus({ resetMs: 1200 })
  const photo = usePromiseStatus({ resetMs: 1000 })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMyProfile().then((p) => {
      if (p) {
        const shaped: Profile = {
          firstName: p.firstName,
          lastName: p.lastName ?? '',
          username: p.username ?? '',
          image: p.image,
          country: p.country ?? '',
          city: p.city ?? ''
        }
        setOriginal(shaped)
        setProfile(shaped)
      }
      setLoaded(true)
    })
  }, [])

  const goBack = () => {
    setNavDirection(-1)
    router.push('/settings?tab=account')
  }

  const dirty = !!profile && !!original && JSON.stringify(profile) !== JSON.stringify(original)

  const fieldFor = (key: keyof Profile): ErrorField | null => {
    if (key === 'firstName' || key === 'lastName' || key === 'username' || key === 'country') return key
    return null
  }

  const handleField = (key: keyof Profile, value: string) => {
    setProfile((p) => (p ? { ...p, [key]: value } : p))
    setError((current) => {
      if (!current) return null
      const matching = fieldFor(key)
      return matching && current.field === matching ? null : current
    })
  }

  const handlePickFile = () => fileRef.current?.click()

  const handleRemoveImage = () => {
    setProfile((p) => (p ? { ...p, image: null } : p))
    setError((current) => (current?.field === 'image' ? null : current))
  }

  const setImageError = (message: string) => setError({ field: 'image', message })

  const handleFile = (file: File) =>
    photo.run(async () => {
      setError(null)
      let stage: 'decode' | 'upload' = 'decode'
      try {
        if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
          setImageError(t(locale, 'profile.imageUnsupported'))
          throw new Error('unsupported')
        }
        const blob = await fileToResizedJpeg(file, RESIZE_MAX_DIM)
        if (blob.size > MAX_IMAGE_BYTES) {
          setImageError(t(locale, 'profile.imageTooLarge'))
          throw new Error('too_large')
        }
        stage = 'upload'
        const formData = new FormData()
        formData.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
        const res = await uploadProfileImage(formData)
        if (!res.ok) {
          setError(mapServerError(res.error, locale))
          throw new Error(res.error)
        }
        setProfile((p) => (p ? { ...p, image: res.url } : p))
      } catch (e) {
        console.error('[profile photo]', stage, file.type, file.size, e)
        setError((current) => current ?? { field: 'image', message: t(locale, stage === 'decode' ? 'profile.imageError' : 'profile.errImageUpload') })
        throw e
      } finally {
        if (fileRef.current) fileRef.current.value = ''
      }
    })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !dirty) return
    setError(null)
    const update: ProfileUpdate = {
      firstName: profile.firstName,
      lastName: profile.lastName.trim() || null,
      username: profile.username.trim() || null,
      image: profile.image,
      country: profile.country.trim() || null,
      city: profile.city.trim() || null
    }
    void save.run(async () => {
      const res = await updateMyProfile(update)
      if (!res.ok) {
        setError(mapServerError(res.error, locale))
        throw new Error(res.error)
      }
      const next: Profile = {
        firstName: res.profile.firstName,
        lastName: res.profile.lastName ?? '',
        username: res.profile.username ?? '',
        image: res.profile.image,
        country: res.profile.country ?? '',
        city: res.profile.city ?? ''
      }
      setOriginal(next)
      setProfile(next)
      const updatedMembers = state.groupMembers.map((m) =>
        m.userId === who ?
          {
            ...m,
            firstName: res.profile.firstName,
            lastName: res.profile.lastName,
            image: res.profile.image
          }
        : m
      )
      applyActiveGroup(state.activeGroupId, updatedMembers)
      goBack()
    })
  }

  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
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
          onClick={goBack}
          leading={<IconArrowLeft size={16} />}
        >
          {t(locale, 'profile.back')}
        </Button>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withMotionDelay(MOTION_TRANSITION.section, 0.06)}
        className='mt-10 shrink-0'
      >
        <h1 className='font-display text-[36px] leading-[0.93] tracking-tight'>
          {t(locale, 'profile.headingLine1')}
          <br />
          <span className='text-sage italic'>{t(locale, 'profile.headingItalic')}</span>
        </h1>
        <p className='text-ink-faint mt-3 text-sm'>{t(locale, 'profile.subtitle')}</p>
      </motion.div>

      <div className='scroll-area -mx-1 mt-8 flex min-h-0 flex-1 flex-col overflow-y-auto px-1'>
        <AnimatePresence mode='wait'>
          {!loaded || !profile ?
            <motion.div
              key='skeleton'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={MOTION_TRANSITION.screen}
            >
              <ProfileSkeleton />
            </motion.div>
          : <motion.form
              key='form'
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={MOTION_TRANSITION.tab}
              onSubmit={submit}
              className='flex flex-col gap-5 pb-2'
            >
              {/* avatar */}
              <section className='flex flex-col gap-2'>
                <div className='flex items-center gap-4'>
                  <Avatar
                    image={resolveAvatarUrl(profile.image)}
                    firstName={profile.firstName}
                    accentBg={accent.bg}
                    size={72}
                    initialClassName='font-display text-2xl'
                  />
                  <div className='flex flex-col gap-2'>
                    <Button
                      variant='secondary'
                      size='xs'
                      shape='pill'
                      className='min-w-36'
                      onClick={handlePickFile}
                      status={photo.status === 'pending' ? 'pending' : 'idle'}
                      pendingLabel={t(locale, 'profile.imageProcessing')}
                    >
                      {t(locale, 'profile.changePhoto')}
                    </Button>
                    {profile.image && (
                      <Button
                        variant='destructive-outline'
                        size='xs'
                        shape='pill'
                        className='min-w-36'
                        onClick={handleRemoveImage}
                        disabled={photo.status === 'pending'}
                      >
                        {t(locale, 'profile.removePhoto')}
                      </Button>
                    )}
                    <input
                      ref={fileRef}
                      type='file'
                      accept={ACCEPT_ATTR}
                      className='hidden'
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFile(file)
                      }}
                    />
                  </div>
                </div>
                <AnimatePresence
                  mode='wait'
                  initial={false}
                >
                  {error?.field === 'image' && (
                    <motion.p
                      key={error.message}
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -2 }}
                      transition={MOTION_TRANSITION.inline}
                      className='text-clay text-[11px]'
                    >
                      {error.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </section>

              {/* names */}
              <Field
                label={t(locale, 'profile.firstNameLabel')}
                value={profile.firstName}
                onChange={(v) => handleField('firstName', v)}
                autoComplete='given-name'
                maxLength={60}
                placeholder={t(locale, 'profile.firstNamePlaceholder')}
                error={error?.field === 'firstName' ? error.message : undefined}
              />
              <Field
                label={t(locale, 'profile.lastNameLabel')}
                value={profile.lastName}
                onChange={(v) => handleField('lastName', v)}
                autoComplete='family-name'
                maxLength={60}
                placeholder={t(locale, 'profile.lastNamePlaceholder')}
                error={error?.field === 'lastName' ? error.message : undefined}
              />

              {/* username */}
              <Field
                label={t(locale, 'profile.usernameLabel')}
                value={profile.username}
                onChange={(v) => handleField('username', v.toLowerCase())}
                autoComplete='off'
                maxLength={24}
                placeholder={t(locale, 'profile.usernamePlaceholder')}
                prefix='@'
                hint={t(locale, 'profile.usernameHint')}
                error={error?.field === 'username' ? error.message : undefined}
              />

              {/* country / city */}
              <div className='grid grid-cols-2 gap-3'>
                <SelectField
                  label={t(locale, 'profile.countryLabel')}
                  value={profile.country}
                  onChange={(v) => handleField('country', v)}
                  placeholder={t(locale, 'profile.countryEmpty')}
                  options={countries.map((c) => ({ value: c.code, label: c.name }))}
                  error={error?.field === 'country' ? error.message : undefined}
                />
                <Field
                  label={t(locale, 'profile.cityLabel')}
                  value={profile.city}
                  onChange={(v) => handleField('city', v)}
                  autoComplete='address-level2'
                  maxLength={60}
                  placeholder={t(locale, 'profile.cityPlaceholder')}
                />
              </div>

              <AnimatePresence
                mode='wait'
                initial={false}
              >
                {error?.field === 'general' && (
                  <motion.p
                    key={error.message}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={MOTION_TRANSITION.inline}
                    className='text-clay text-sm'
                  >
                    {error.message}
                  </motion.p>
                )}
              </AnimatePresence>

              <Button
                type='submit'
                variant='primary'
                size='md'
                fullWidth
                className='mt-2'
                disabled={!dirty || photo.status === 'pending'}
                status={save.status}
                pendingLabel={t(locale, 'profile.saving')}
              >
                {t(locale, 'profile.save')}
              </Button>
            </motion.form>
          }
        </AnimatePresence>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  maxLength,
  prefix,
  hint,
  error
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  maxLength?: number
  prefix?: string
  hint?: string
  error?: string
}) {
  const ringClass = error ? 'ring-2 ring-clay/40' : 'focus-within:ring-2 ring-sage/40'
  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-ink-faint text-xs'>{label}</label>
      <div className={`border-line bg-paper flex items-center rounded-xl border transition-all ${ringClass}`}>
        {prefix && <span className='text-ink-faint pl-3 text-sm'>{prefix}</span>}
        <input
          type='text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={`text-ink placeholder:text-ink-faint w-full bg-transparent py-3 text-sm outline-none ${prefix ? 'pr-3 pl-2' : 'px-3'}`}
        />
      </div>
      <FieldHint
        error={error}
        hint={hint}
      />
    </div>
  )
}

function FieldHint({ error, hint }: { error?: string; hint?: string }) {
  return (
    <AnimatePresence
      mode='wait'
      initial={false}
    >
      {error ?
        <motion.p
          key='error'
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={MOTION_TRANSITION.inline}
          className='text-clay text-[11px]'
        >
          {error}
        </motion.p>
      : hint ?
        <motion.p
          key='hint'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={MOTION_TRANSITION.inline}
          className='text-ink-faint text-[11px]'
        >
          {hint}
        </motion.p>
      : null}
    </AnimatePresence>
  )
}

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  options,
  error
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: { value: string; label: string }[]
  error?: string
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-ink-faint text-xs'>{label}</label>
      <div
        className={`border-line bg-paper relative flex items-center rounded-xl border transition-all ${error ? 'ring-clay/40 ring-2' : 'ring-sage/40 focus-within:ring-2'}`}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none bg-transparent py-3 pr-9 pl-3 text-sm outline-none ${value ? 'text-ink' : 'text-ink-faint'}`}
        >
          <option value=''>{placeholder}</option>
          {options.map((o) => (
            <option
              key={o.value}
              value={o.value}
            >
              {o.label}
            </option>
          ))}
        </select>
        <IconChevronDown
          size={14}
          className='text-ink-faint pointer-events-none absolute right-3'
        />
      </div>
      <FieldHint error={error} />
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className='flex flex-col gap-5 pb-2'>
      {/* avatar + photo pills */}
      <div className='flex items-center gap-4'>
        <span
          aria-hidden
          className='bg-line/60 block h-[72px] w-[72px] animate-pulse rounded-full'
        />
        <div className='flex flex-col gap-2'>
          <span
            aria-hidden
            className='bg-line/60 block h-10 w-36 animate-pulse rounded-full'
          />
          <span
            aria-hidden
            className='bg-line/60 block h-10 w-36 animate-pulse rounded-full'
          />
        </div>
      </div>

      <FieldRowSkeleton labelClass='w-24' />
      <FieldRowSkeleton labelClass='w-16' />
      <FieldRowSkeleton
        labelClass='w-32'
        hint
      />

      <div className='grid grid-cols-2 gap-3'>
        <FieldRowSkeleton labelClass='w-10' />
        <FieldRowSkeleton labelClass='w-12' />
      </div>

      <Skel className='mt-2 h-12 w-full rounded-xl' />
    </div>
  )
}

function FieldRowSkeleton({ labelClass, hint }: { labelClass: string; hint?: boolean }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <Skel className={`h-3 ${labelClass}`} />
      <Skel className='h-12 w-full rounded-xl' />
      {hint && <Skel className='mt-0.5 h-2.5 w-44' />}
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

const ERROR_BY_CODE: Record<string, { field: ErrorField; key: TKey }> = {
  first_name_required: { field: 'firstName', key: 'profile.errFirstNameRequired' },
  first_name_too_long: { field: 'firstName', key: 'profile.errFirstNameTooLong' },
  last_name_too_long: { field: 'lastName', key: 'profile.errLastNameTooLong' },
  username_invalid: { field: 'username', key: 'profile.errUsernameInvalid' },
  username_taken: { field: 'username', key: 'profile.errUsernameTaken' },
  country_invalid: { field: 'country', key: 'profile.errCountryInvalid' },
  image_invalid: { field: 'image', key: 'profile.errImageInvalid' },
  image_too_large: { field: 'image', key: 'profile.imageTooLarge' },
  image_upload_failed: { field: 'image', key: 'profile.errImageUpload' }
}

function mapServerError(code: string, locale: Locale): FormError {
  const match = ERROR_BY_CODE[code]
  if (match) return { field: match.field, message: t(locale, match.key) }
  return { field: 'general', message: t(locale, 'profile.errGeneric') }
}
