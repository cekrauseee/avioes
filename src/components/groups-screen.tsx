'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { deleteGroup, getUserGroups, leaveGroup, setActiveGroup } from '../actions'
import { authClient } from '../lib/auth-client'
import { t } from '../lib/i18n'
import { MOTION_TRANSITION, withMotionDelay } from '../lib/motion'
import { applyLocalIdentity, applyServerSnapshot, selectLocale, useOfflineState } from '../lib/offline-store'
import type { Locale } from '../lib/types'
import { AnimatedList, AnimatedListItem } from './animated-list'
import { Button, ButtonLink } from './button'
import { ConfirmActionSlot, ConfirmRow, ConfirmTriggerRow } from './confirm-row'
import { ExpandableItem } from './expandable-item'
import { IconArrowLeft, IconChevronRight, IconLogOut, IconPlus, IconSettings, IconUsers, IconX } from './icons'

type GroupEntry = { id: string; name: string; ownerId: string; memberCount: number }

export function GroupsScreen({ from }: { from?: string }) {
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
        transition={MOTION_TRANSITION.header}
        className='flex items-center justify-between gap-3'
      >
        {from === 'settings' ?
          <Button
            variant='secondary'
            size='sm'
            shape='pill'
            onClick={() => router.back()}
            leading={<IconArrowLeft size={16} />}
          >
            {t(locale, 'groups.manage.back')}
          </Button>
        : <span className='text-ink-faint font-display text-sm italic'>{t(locale, 'auth.header')}</span>}
        <ButtonLink
          href='/groups/new'
          variant='row-accent'
          size='sm'
          shape='pill'
          align='center'
          className='font-medium'
          leading={<IconPlus size={14} />}
        >
          {t(locale, 'groups.new')}
        </ButtonLink>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withMotionDelay(MOTION_TRANSITION.section, 0.08)}
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
        transition={withMotionDelay(MOTION_TRANSITION.section, 0.15)}
        className='mt-8 flex flex-1 flex-col gap-3'
      >
        {!loaded ?
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        : <AnimatedList className='flex flex-col gap-3'>
            {groups.length === 0 ?
              <AnimatedListItem key='empty'>
                <EmptyState locale={locale} />
              </AnimatedListItem>
            : groups.map((group, i) => {
                const isActive = group.id === state.activeGroupId
                const isOwner = group.ownerId === state.identity
                const expanded = expandedId === group.id
                const isBusy = busyId === group.id
                return (
                  <AnimatedListItem
                    key={group.id}
                    enterDelay={0.2 + i * 0.06}
                  >
                    <ExpandableItem
                      expanded={expanded}
                      onToggle={() => toggleExpanded(group.id)}
                      toggleAriaLabel={t(locale, 'groups.actions')}
                      active={isActive}
                      main={
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
                                transition={MOTION_TRANSITION.pulse}
                                className='text-sage'
                              >
                                …
                              </motion.span>
                            : isActive ?
                              <span className='text-sage'>{t(locale, 'groups.open')}</span>
                            : <span className='text-sage'>{t(locale, 'groups.enter')}</span>}
                          </span>
                        </button>
                      }
                    >
                      <div className='flex flex-col'>
                        {isOwner ?
                          <>
                            <ButtonLink
                              href={`/groups/${group.id}/edit`}
                              variant='ghost'
                              size='md'
                              shape='square'
                              fullWidth
                              align='between'
                              className='px-5'
                              leading={<IconSettings size={14} className='text-ink-faint' />}
                              trailing={<IconChevronRight size={14} className='text-ink-faint' />}
                            >
                              {t(locale, 'groups.editName')}
                            </ButtonLink>
                            <ButtonLink
                              href={`/groups/${group.id}/manage`}
                              variant='ghost'
                              size='md'
                              shape='square'
                              fullWidth
                              align='between'
                              className='border-line border-t px-5'
                              leading={<IconUsers size={14} className='text-ink-faint' />}
                              trailing={<IconChevronRight size={14} className='text-ink-faint' />}
                            >
                              {t(locale, 'groups.manageMembers')}
                            </ButtonLink>
                            <ConfirmActionSlot>
                              {confirmingDelete === group.id ?
                                <ConfirmRow
                                  key='confirm-delete'
                                  label={t(locale, 'groups.confirmDelete')}
                                  busy={isBusy}
                                  disabled={pending}
                                  cancelLabel={t(locale, 'groups.cancel')}
                                  confirmLabel={t(locale, 'groups.confirm')}
                                  onCancel={() => setConfirmingDelete(null)}
                                  onConfirm={() => handleDelete(group.id)}
                                  bordered
                                />
                              : <ConfirmTriggerRow
                                  key='delete'
                                  label={t(locale, 'groups.deleteGroup')}
                                  icon={<IconX size={14} />}
                                  disabled={pending}
                                  bordered
                                  onClick={() => {
                                    setConfirmingDelete(group.id)
                                    setConfirmingLeave(null)
                                  }}
                                />
                              }
                            </ConfirmActionSlot>
                          </>
                        : <ConfirmActionSlot>
                            {confirmingLeave === group.id ?
                              <ConfirmRow
                                key='confirm-leave'
                                label={t(locale, 'groups.confirmLeave')}
                                busy={isBusy}
                                disabled={pending}
                                cancelLabel={t(locale, 'groups.cancel')}
                                confirmLabel={t(locale, 'groups.confirm')}
                                onCancel={() => setConfirmingLeave(null)}
                                onConfirm={() => handleLeave(group.id)}
                              />
                            : <ConfirmTriggerRow
                                key='leave'
                                label={t(locale, 'groups.leaveGroup')}
                                icon={<IconLogOut size={14} />}
                                disabled={pending}
                                onClick={() => {
                                  setConfirmingLeave(group.id)
                                  setConfirmingDelete(null)
                                }}
                              />
                            }
                          </ConfirmActionSlot>
                        }
                      </div>
                    </ExpandableItem>
                  </AnimatedListItem>
                )
              })
            }
          </AnimatedList>
        }
      </motion.div>
    </div>
  )
}

function EmptyState({ locale }: { locale: Locale }) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
    } finally {
      applyLocalIdentity(null)
      router.replace('/auth')
      router.refresh()
    }
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
      <ButtonLink
        href='/groups/new'
        variant='primary'
        size='md'
        fullWidth
        className='mt-2 max-w-56'
      >
        {t(locale, 'groups.createArrow')}
      </ButtonLink>
      <Button
        variant='destructive-outline'
        size='sm'
        fullWidth
        className='mt-2 max-w-56'
        onClick={handleSignOut}
        leading={<IconLogOut size={14} className='opacity-60' />}
      >
        {t(locale, 'groups.signOut')}
      </Button>
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
