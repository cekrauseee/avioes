'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createNewGroup, setActiveGroup } from '../actions'
import { t } from '../lib/i18n'
import { applyServerSnapshot, selectLocale, useOfflineState } from '../lib/offline-store'

export function NewGroupScreen() {
  const router = useRouter()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t(locale, 'groups.new.nameRequired'))
      return
    }
    setError(null)
    start(async () => {
      try {
        const result = await createNewGroup(name.trim())
        if ('error' in result) {
          setError(result.error)
          return
        }
        const snapshot = await setActiveGroup(result.groupId)
        if (!snapshot.activeGroupId) {
          setError(t(locale, 'groups.new.error'))
          return
        }
        applyServerSnapshot(snapshot)
        router.replace('/')
      } catch {
        setError(t(locale, 'groups.new.error'))
      }
    })
  }

  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className='flex items-center justify-between gap-3'
      >
        <span className='text-ink-faint font-display text-sm italic'>{t(locale, 'auth.header')}</span>
        <button
          type='button'
          onClick={() => router.back()}
          className='border-line bg-paper text-ink-soft hover:bg-line/40 focus-visible:bg-line/40 focus-visible:ring-sage/40 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]'
        >
          <span aria-hidden>←</span>
          <span>{t(locale, 'groups.new.back')}</span>
        </button>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className='mt-12'
      >
        <h1 className='font-display text-[36px] leading-[0.93] tracking-tight'>
          {t(locale, 'groups.new.line1')}
          <br />
          <span className='text-sage italic'>{t(locale, 'groups.new.italic')}</span>
        </h1>
        <p className='text-ink-faint mt-3 text-sm'>{t(locale, 'groups.new.subtitle')}</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        onSubmit={handleSubmit}
        className='mt-10 flex flex-col gap-4'
      >
        <div className='flex flex-col gap-1.5'>
          <label className='text-ink-faint text-xs'>{t(locale, 'groups.new.nameLabel')}</label>
          <input
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t(locale, 'groups.new.namePlaceholder')}
            autoFocus
            maxLength={60}
            className='border-line bg-paper text-ink placeholder:text-ink-faint ring-sage/40 w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none focus:ring-2'
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

        <button
          type='submit'
          disabled={pending || !name.trim()}
          className='bg-sage text-bg mt-2 flex h-12 items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50'
        >
          {pending ?
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {t(locale, 'groups.new.creating')}
            </motion.span>
          : t(locale, 'groups.new.createBtn')}
        </button>
      </motion.form>
    </div>
  )
}
