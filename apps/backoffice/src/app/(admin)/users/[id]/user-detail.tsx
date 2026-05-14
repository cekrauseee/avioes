'use client'

import { DATE_LOCALE, t } from '@airplanes/i18n'
import type { Locale } from '@airplanes/types'
import { KNOWN_FEATURE_FLAGS } from '@airplanes/types/feature-flags'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { restoreUser, setFeatureFlags, softDeleteUser, updateUser } from '../../../../actions/admin'

type UserData = {
  id: string
  name: string
  firstName: string | null
  lastName: string | null
  username: string | null
  email: string
  emailVerified: boolean
  image: string | null
  country: string | null
  city: string | null
  onboardingStatus: string | null
  featureFlags: string[]
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  groups: { id: string; name: string; ownerId: string; deletedAt: Date | null }[]
  activeGroupId: string | null
}

export function UserDetail({ user, locale }: { user: UserData; locale: Locale }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')

  const [firstName, setFirstName] = useState(user.firstName ?? '')
  const [lastName, setLastName] = useState(user.lastName ?? '')
  const [username, setUsername] = useState(user.username ?? '')
  const [email, setEmail] = useState(user.email)
  const [emailVerified, setEmailVerified] = useState(user.emailVerified)
  const [onboardingStatus, setOnboardingStatus] = useState(user.onboardingStatus ?? 'pending')
  const [flags, setFlags] = useState(user.featureFlags)

  const handleSave = () => {
    startTransition(async () => {
      setMessage('')
      await updateUser(user.id, { firstName, lastName, username, email, emailVerified, onboardingStatus })
      setMessage(t(locale, 'admin.user.saved'))
      router.refresh()
    })
  }

  const handleSaveFlags = () => {
    startTransition(async () => {
      setMessage('')
      await setFeatureFlags(user.id, flags)
      setMessage(t(locale, 'admin.user.flagsSaved'))
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!confirm(`${t(locale, 'admin.user.softDelete')}? ${t(locale, 'admin.user.softDeleteConfirm')}`)) return
    startTransition(async () => {
      setMessage('')
      const result = await softDeleteUser(user.id)
      if (!result.ok) {
        setMessage(result.error === 'user_owns_groups' ? t(locale, 'admin.user.ownsGroups') : result.error)
        return
      }
      router.refresh()
    })
  }

  const handleRestore = () => {
    startTransition(async () => {
      setMessage('')
      const result = await restoreUser(user.id)
      if (!result.ok) {
        setMessage(result.error === 'email_or_username_taken' ? t(locale, 'admin.user.restoreConflict') : result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className='mx-auto max-w-2xl'>
      <Link
        href='/users'
        className='text-ink-faint hover:text-ink-soft mb-4 inline-block text-sm'
      >
        {t(locale, 'admin.back')}
      </Link>
      <h1 className='mb-6 text-2xl font-semibold'>{user.firstName ?? user.name}</h1>

      {user.deletedAt && (
        <div className='bg-clay-soft text-clay mb-4 rounded-lg p-3 text-sm'>
          {t(locale, 'admin.user.deletedBanner')} {new Date(user.deletedAt).toLocaleDateString(DATE_LOCALE[locale])}
        </div>
      )}

      <section className='border-line bg-paper mb-6 rounded-xl border p-5'>
        <h2 className='text-ink-faint mb-4 text-sm font-medium'>{t(locale, 'admin.user.identity')}</h2>
        <div className='grid grid-cols-2 gap-4'>
          <Field
            label={t(locale, 'admin.user.firstName')}
            value={firstName}
            onChange={setFirstName}
          />
          <Field
            label={t(locale, 'admin.user.lastName')}
            value={lastName}
            onChange={setLastName}
          />
          <Field
            label={t(locale, 'admin.users.username')}
            value={username}
            onChange={setUsername}
          />
          <Field
            label={t(locale, 'admin.users.email')}
            value={email}
            onChange={setEmail}
          />
          <div>
            <label className='text-ink-faint mb-1 block text-xs'>{t(locale, 'admin.user.emailVerified')}</label>
            <input
              type='checkbox'
              checked={emailVerified}
              onChange={(e) => setEmailVerified(e.target.checked)}
            />
          </div>
          <div>
            <label className='text-ink-faint mb-1 block text-xs'>{t(locale, 'admin.user.onboardingStatus')}</label>
            <select
              value={onboardingStatus}
              onChange={(e) => setOnboardingStatus(e.target.value)}
              className='border-line rounded border px-2 py-1.5 text-sm'
            >
              <option value='pending'>pending</option>
              <option value='complete'>complete</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className='bg-sage mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
        >
          {isPending ? t(locale, 'admin.user.saving') : t(locale, 'admin.user.save')}
        </button>
      </section>

      <section className='border-line bg-paper mb-6 rounded-xl border p-5'>
        <h2 className='text-ink-faint mb-4 text-sm font-medium'>{t(locale, 'admin.user.preferences')}</h2>
        <div className='grid grid-cols-2 gap-4 text-sm'>
          <ReadOnlyField
            label={t(locale, 'admin.user.country')}
            value={user.country ?? '—'}
          />
          <ReadOnlyField
            label={t(locale, 'admin.user.city')}
            value={user.city ?? '—'}
          />
          <ReadOnlyField
            label={t(locale, 'admin.user.activeGroup')}
            value={user.activeGroupId ?? '—'}
          />
        </div>
      </section>

      <section className='border-line bg-paper mb-6 rounded-xl border p-5'>
        <h2 className='text-ink-faint mb-4 text-sm font-medium'>{t(locale, 'admin.user.featureFlags')}</h2>
        <div className='flex flex-col gap-2'>
          {KNOWN_FEATURE_FLAGS.map((flag) => (
            <label
              key={flag}
              className='flex items-center gap-2 text-sm'
            >
              <input
                type='checkbox'
                checked={flags.includes(flag)}
                onChange={(e) => {
                  setFlags((prev) => (e.target.checked ? [...prev, flag] : prev.filter((f) => f !== flag)))
                }}
              />
              {flag}
            </label>
          ))}
        </div>
        <button
          onClick={handleSaveFlags}
          disabled={isPending}
          className='bg-sage mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
        >
          {t(locale, 'admin.user.saveFlags')}
        </button>
      </section>

      <section className='border-line bg-paper mb-6 rounded-xl border p-5'>
        <h2 className='text-ink-faint mb-4 text-sm font-medium'>{t(locale, 'admin.user.groups')}</h2>
        {user.groups.length === 0 ?
          <p className='text-ink-faint text-sm'>{t(locale, 'admin.user.noGroups')}</p>
        : <ul className='space-y-2'>
            {user.groups.map((g) => (
              <li
                key={g.id}
                className='flex items-center gap-2 text-sm'
              >
                <Link
                  href={`/groups/${g.id}`}
                  className='font-medium'
                >
                  {g.name}
                </Link>
                {g.ownerId === user.id && <span className='bg-sage-soft text-sage rounded px-1.5 py-0.5 text-xs'>{t(locale, 'admin.user.owner')}</span>}
              </li>
            ))}
          </ul>
        }
      </section>

      <section className='border-line bg-paper rounded-xl border p-5'>
        <h2 className='text-ink-faint mb-4 text-sm font-medium'>{t(locale, 'admin.user.status')}</h2>
        {user.deletedAt ?
          <button
            onClick={handleRestore}
            disabled={isPending}
            className='bg-sage rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
          >
            {t(locale, 'admin.user.restore')}
          </button>
        : <button
            onClick={handleDelete}
            disabled={isPending}
            className='bg-clay rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
          >
            {t(locale, 'admin.user.softDelete')}
          </button>
        }
      </section>

      {message && <p className='text-sage mt-4 text-sm'>{message}</p>}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className='text-ink-faint mb-1 block text-xs'>{label}</label>
      <input
        type='text'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className='border-line focus:ring-sage w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-1'
      />
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-ink-faint mb-1 text-xs'>{label}</p>
      <p className='text-sm'>{value}</p>
    </div>
  )
}
