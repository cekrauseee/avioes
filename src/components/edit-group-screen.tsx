'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { getGroupDetails, updateGroup } from '../actions'
import { t } from '../lib/i18n'
import { MOTION_TRANSITION, withMotionDelay } from '../lib/motion'
import { selectLocale, useOfflineState } from '../lib/offline-store'
import { Button } from './button'

export function EditGroupScreen({ groupId }: { groupId: string }) {
  const router = useRouter()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const [name, setName] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    getGroupDetails(groupId).then((data) => {
      if (data) {
        setName(data.name)
        setOriginalName(data.name)
        setIsOwner(data.isOwner)
      }
      setLoaded(true)
    })
  }, [groupId])

  const trimmed = name.trim()
  const dirty = trimmed !== originalName && trimmed.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dirty) return
    setError(null)
    start(async () => {
      try {
        const result = await updateGroup(groupId, { name: trimmed })
        if ('error' in result) {
          setError(result.error)
          return
        }
        setOriginalName(trimmed)
        router.back()
      } catch {
        setError(t(locale, 'groups.edit.error'))
      }
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
          onClick={() => router.back()}
          leading={<span aria-hidden>←</span>}
        >
          {t(locale, 'groups.edit.back')}
        </Button>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withMotionDelay(MOTION_TRANSITION.section, 0.08)}
        className='mt-12'
      >
        <h1 className='font-display text-[36px] leading-[0.93] tracking-tight'>
          {t(locale, 'groups.edit.line1')}
          <br />
          <span className='text-sage italic'>{t(locale, 'groups.edit.italic')}</span>
        </h1>
      </motion.div>

      {loaded && !isOwner ?
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={withMotionDelay(MOTION_TRANSITION.sectionMedium, 0.15)}
          className='text-ink-faint mt-10 text-sm'
        >
          {t(locale, 'groups.edit.ownerOnly')}
        </motion.p>
      : <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={withMotionDelay(MOTION_TRANSITION.section, 0.15)}
          onSubmit={handleSubmit}
          className='mt-10 flex flex-col gap-4'
        >
          <div className='flex flex-col gap-1.5'>
            <label className='text-ink-faint text-xs'>{t(locale, 'groups.edit.nameLabel')}</label>
            <input
              type='text'
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder={t(locale, 'groups.edit.placeholder')}
              disabled={!loaded}
              maxLength={60}
              className='border-line bg-paper text-ink placeholder:text-ink-faint ring-sage/40 w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none focus:ring-2 disabled:opacity-50'
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
            disabled={!dirty || !loaded}
            status={pending ? 'pending' : 'idle'}
            pendingLabel={t(locale, 'groups.edit.saving')}
          >
            {t(locale, 'groups.edit.save')}
          </Button>
        </motion.form>
      }
    </div>
  )
}
