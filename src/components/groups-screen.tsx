'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { deleteGroup, getUserGroups, leaveGroup, setActiveGroup } from '../actions'
import { authClient } from '../lib/auth-client'
import { t } from '../lib/i18n'
import { applyLocalIdentity, applyServerSnapshot, selectLocale, useOfflineState } from '../lib/offline-store'
import type { Locale } from '../lib/types'

type GroupEntry = { id: string; name: string; ownerId: string; memberCount: number }

export function GroupsScreen() {
  const router = useRouter()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const [groups, setGroups] = useState<GroupEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [confirmingLeave, setConfirmingLeave] = useState<string | null>(null)

  useEffect(() => {
    getUserGroups().then((data) => {
      setGroups(data)
      setLoaded(true)
    })
  }, [])

  const refresh = async () => {
    const data = await getUserGroups()
    setGroups(data)
  }

  const switchTo = (groupId: string) => {
    if (groupId === state.activeGroupId) {
      router.replace('/')
      return
    }
    setBusyId(groupId)
    startTransition(async () => {
      try {
        const snapshot = await setActiveGroup(groupId)
        if (snapshot.activeGroupId) {
          applyServerSnapshot(snapshot)
          router.replace('/')
        }
      } finally {
        setBusyId(null)
      }
    })
  }

  const handleDelete = (groupId: string) => {
    setBusyId(groupId)
    startTransition(async () => {
      try {
        const result = await deleteGroup(groupId)
        if ('success' in result) {
          await refresh()
          if (groupId === state.activeGroupId) router.refresh()
        }
      } finally {
        setBusyId(null)
        setExpandedId(null)
        setConfirmingDelete(null)
      }
    })
  }

  const handleLeave = (groupId: string) => {
    setBusyId(groupId)
    startTransition(async () => {
      try {
        const result = await leaveGroup(groupId)
        if ('success' in result) {
          await refresh()
          if (groupId === state.activeGroupId) router.refresh()
        }
      } finally {
        setBusyId(null)
        setExpandedId(null)
        setConfirmingLeave(null)
      }
    })
  }

  const toggleExpanded = (groupId: string) => {
    setExpandedId((prev) => (prev === groupId ? null : groupId))
    setConfirmingDelete(null)
    setConfirmingLeave(null)
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
        <Link
          href='/groups/new'
          className='border-line bg-paper text-sage hover:bg-sage-soft focus-visible:bg-sage-soft focus-visible:ring-sage/40 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]'
        >
          <span aria-hidden>+</span>
          <span>{t(locale, 'groups.new')}</span>
        </Link>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className='mt-10'
      >
        <h1 className='font-display text-[34px] leading-[0.93] tracking-tight'>
          {t(locale, 'groups.yourLine1')}
          <br />
          <span className='text-clay italic'>{t(locale, 'groups.yourItalic')}</span>
        </h1>
        <p className='text-ink-faint mt-3 text-sm'>{t(locale, 'groups.subtitle')}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className='mt-8 flex flex-1 flex-col gap-3'
      >
        {!loaded ?
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        : groups.length === 0 ?
          <EmptyState locale={locale} />
        : groups.map((group, i) => {
            const isActive = group.id === state.activeGroupId
            const isOwner = group.ownerId === state.identity
            const expanded = expandedId === group.id
            const isBusy = busyId === group.id
            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className={`border-line bg-paper overflow-hidden rounded-2xl border ${isActive ? 'ring-sage/30 ring-2' : ''}`}
              >
                <div className='flex items-stretch'>
                  <button
                    type='button'
                    onClick={() => switchTo(group.id)}
                    disabled={pending && !isActive}
                    className='hover:bg-sage-soft/40 flex flex-1 items-center justify-between gap-3 px-5 py-4 text-left transition-colors disabled:cursor-default disabled:hover:bg-transparent'
                  >
                    <div className='flex flex-col gap-0.5'>
                      <span className='font-display text-xl'>{group.name}</span>
                      <span className='text-ink-faint text-xs'>
                        {group.memberCount} {group.memberCount === 1 ? t(locale, 'groups.memberCount') : t(locale, 'groups.memberCountPlural')}
                      </span>
                    </div>
                    <span className='text-sm font-medium'>
                      {isBusy ?
                        <motion.span
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className='text-sage'
                        >
                          …
                        </motion.span>
                      : isActive ?
                        <span className='text-sage'>{t(locale, 'groups.open')}</span>
                      : <span className='text-sage'>{t(locale, 'groups.enter')}</span>}
                    </span>
                  </button>
                  <button
                    type='button'
                    onClick={() => toggleExpanded(group.id)}
                    aria-label={t(locale, 'groups.actions')}
                    aria-expanded={expanded}
                    className={`text-ink-faint hover:text-ink-soft border-line flex w-20 shrink-0 items-center justify-center border-l text-2xl leading-none transition-colors ${expanded ? 'bg-line/30' : ''}`}
                  >
                    ⋯
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key='actions'
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className='border-line border-t'
                    >
                      <div className='flex flex-col'>
                        {isOwner ?
                          <>
                            <Link
                              href={`/groups/${group.id}/edit`}
                              className='text-ink-soft hover:bg-line/30 flex min-h-12 items-center justify-between px-5 text-sm transition-colors'
                            >
                              <span>{t(locale, 'groups.editName')}</span>
                              <span className='text-ink-faint'>→</span>
                            </Link>
                            <Link
                              href={`/groups/${group.id}/manage`}
                              className='text-ink-soft hover:bg-line/30 border-line flex min-h-12 items-center justify-between border-t px-5 text-sm transition-colors'
                            >
                              <span>{t(locale, 'groups.manageMembers')}</span>
                              <span className='text-ink-faint'>→</span>
                            </Link>
                            {confirmingDelete === group.id ?
                              <ConfirmRow
                                label={t(locale, 'groups.confirmDelete')}
                                busy={isBusy}
                                pending={pending}
                                locale={locale}
                                onCancel={() => setConfirmingDelete(null)}
                                onConfirm={() => handleDelete(group.id)}
                                bordered
                              />
                            : <button
                                type='button'
                                disabled={pending}
                                onClick={() => {
                                  setConfirmingDelete(group.id)
                                  setConfirmingLeave(null)
                                }}
                                className='border-line text-clay hover:bg-clay/8 flex min-h-12 items-center justify-between border-t px-5 text-sm transition-colors disabled:opacity-50'
                              >
                                <span>{t(locale, 'groups.deleteGroup')}</span>
                                <span>×</span>
                              </button>
                            }
                          </>
                        : confirmingLeave === group.id ?
                          <ConfirmRow
                            label={t(locale, 'groups.confirmLeave')}
                            busy={isBusy}
                            pending={pending}
                            locale={locale}
                            onCancel={() => setConfirmingLeave(null)}
                            onConfirm={() => handleLeave(group.id)}
                          />
                        : <button
                            type='button'
                            disabled={pending}
                            onClick={() => {
                              setConfirmingLeave(group.id)
                              setConfirmingDelete(null)
                            }}
                            className='text-clay hover:bg-clay/8 flex min-h-12 items-center justify-between px-5 text-sm transition-colors disabled:opacity-50'
                          >
                            <span>{t(locale, 'groups.leaveGroup')}</span>
                            <span>↩</span>
                          </button>
                        }
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        }
      </motion.div>
    </div>
  )
}

function ConfirmRow({
  label,
  busy,
  pending,
  locale,
  onCancel,
  onConfirm,
  bordered
}: {
  label: string
  busy: boolean
  pending: boolean
  locale: Locale
  onCancel: () => void
  onConfirm: () => void
  bordered?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className={`flex flex-col ${bordered ? 'border-line border-t' : ''}`}
    >
      <span className='text-clay px-5 pt-3 pb-2 text-sm'>{label}</span>
      <div className='border-line grid grid-cols-2 border-t'>
        <button
          type='button'
          onClick={onCancel}
          disabled={busy}
          className='text-ink-soft hover:bg-line/40 min-h-16 text-sm transition-colors disabled:opacity-50'
        >
          {t(locale, 'groups.cancel')}
        </button>
        <button
          type='button'
          onClick={onConfirm}
          disabled={pending}
          className='bg-clay text-bg border-line min-h-16 border-l text-sm font-medium transition-colors disabled:opacity-60'
        >
          {busy ?
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              …
            </motion.span>
          : t(locale, 'groups.confirm')}
        </button>
      </div>
    </motion.div>
  )
}

function EmptyState({ locale }: { locale: Locale }) {
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut()
    applyLocalIdentity(null)
    router.replace('/auth')
    router.refresh()
  }

  return (
    <div className='flex flex-col items-center gap-4 py-12 text-center'>
      <span
        className='text-ink-faint text-4xl'
        aria-hidden
      >
        ✈
      </span>
      <div>
        <p className='text-ink-soft text-sm'>{t(locale, 'groups.empty')}</p>
        <p className='text-ink-faint mt-1 text-xs'>{t(locale, 'groups.emptyHint')}</p>
      </div>
      <Link
        href='/groups/new'
        className='bg-sage text-bg focus-visible:ring-sage/40 mt-2 flex min-h-12 w-full max-w-56 items-center justify-center rounded-xl px-5 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]'
      >
        {t(locale, 'groups.createArrow')}
      </Link>
      <button
        type='button'
        onClick={handleSignOut}
        className='border-clay/30 text-clay hover:bg-clay/8 mt-2 flex min-h-11 w-full max-w-56 items-center justify-center rounded-xl border px-5 text-sm transition-all active:scale-[0.98]'
      >
        {t(locale, 'groups.signOut')}
      </button>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className='border-line bg-paper flex animate-pulse items-center justify-between rounded-2xl border px-5 py-4'>
      <div className='flex flex-col gap-2'>
        <div className='bg-line h-5 w-32 rounded' />
        <div className='bg-line h-3 w-16 rounded' />
      </div>
      <div className='bg-line h-4 w-12 rounded' />
    </div>
  )
}
