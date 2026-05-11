'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  acceptInviteFromNotification,
  deleteNotificationAction,
  getNotifications,
  markNotificationsAsRead,
  rejectInviteFromNotification,
  toggleNotificationReadStatus
} from '../actions'
import { t, tf } from '../lib/i18n'
import { MOTION_TRANSITION, withMotionDelay } from '../lib/motion'
import { applyServerSnapshot, selectLocale, useOfflineState } from '../lib/offline-store'
import { useRealtimeNotifications } from '../lib/realtime'
import type { Locale, Notification } from '../lib/types'
import { Avatar } from './avatar'
import { Button, ButtonLink, usePromiseStatus } from './button'
import { ConfirmActionSlot, ConfirmRow, ConfirmTriggerRow } from './confirm-row'
import { IconArrowLeft, IconMore } from './icons'

export function NotificationsScreen() {
  const router = useRouter()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const userId = state.identity

  const [items, setItems] = useState<Notification[]>([])
  const [loaded, setLoaded] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  const refresh = useCallback(() => {
    void getNotifications().then((data) => {
      setItems(data)
      setLoaded(true)
      const unreadIds = data.filter((n) => !n.read).map((n) => n.id)
      if (unreadIds.length > 0) void markNotificationsAsRead(unreadIds)
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useRealtimeNotifications(userId, refresh)

  const handleToggleRead = async (id: string) => {
    const result = await toggleNotificationReadStatus(id)
    if (result.ok) {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: result.read } : n)))
    }
    setExpandedId(null)
  }

  const handleDelete = async (id: string) => {
    await deleteNotificationAction(id)
    setItems((prev) => prev.filter((n) => n.id !== id))
    setExpandedId(null)
    setConfirmingDelete(null)
  }

  const handleAccepted = (notificationId: string) => {
    setItems((prev) => prev.filter((n) => n.id !== notificationId))
  }

  const handleRejected = (notificationId: string) => {
    setItems((prev) => prev.filter((n) => n.id !== notificationId))
  }

  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={MOTION_TRANSITION.header}
        className='flex items-center justify-between gap-3'
      >
        <span className='text-ink-faint font-display text-sm italic'>{t(locale, 'notifications.ariaLabel')}</span>
        <ButtonLink
          href='/'
          variant='secondary'
          size='sm'
          shape='pill'
          align='center'
          leading={<IconArrowLeft size={16} />}
        >
          {t(locale, 'notifications.back')}
        </ButtonLink>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withMotionDelay(MOTION_TRANSITION.section, 0.08)}
        className='mt-10'
      >
        <h1 className='font-display text-[34px] leading-[0.93] tracking-tight'>
          {t(locale, 'notifications.title')}
          <br />
          <span className='text-clay italic'>{t(locale, 'notifications.italic')}</span>
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withMotionDelay(MOTION_TRANSITION.section, 0.15)}
        className='scroll-area -mx-6 mt-8 flex flex-1 flex-col gap-3 overflow-y-auto px-6'
      >
        {!loaded ?
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        : items.length === 0 ?
          <EmptyState locale={locale} />
        : items.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={withMotionDelay(MOTION_TRANSITION.section, 0.2 + i * 0.04)}
            >
              <NotificationCard
                notification={n}
                locale={locale}
                expanded={expandedId === n.id}
                confirmingDelete={confirmingDelete === n.id}
                onToggleExpand={() => {
                  setExpandedId((prev) => (prev === n.id ? null : n.id))
                  setConfirmingDelete(null)
                }}
                onToggleRead={() => handleToggleRead(n.id)}
                onRequestDelete={() => setConfirmingDelete(n.id)}
                onCancelDelete={() => setConfirmingDelete(null)}
                onConfirmDelete={() => handleDelete(n.id)}
                onAccepted={() => handleAccepted(n.id)}
                onRejected={() => handleRejected(n.id)}
                router={router}
              />
            </motion.div>
          ))
        }
      </motion.div>
    </div>
  )
}

function NotificationCard({
  notification: n,
  locale,
  expanded,
  confirmingDelete,
  onToggleExpand,
  onToggleRead,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onAccepted,
  onRejected,
  router
}: {
  notification: Notification
  locale: Locale
  expanded: boolean
  confirmingDelete: boolean
  onToggleExpand: () => void
  onToggleRead: () => void
  onRequestDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
  onAccepted: () => void
  onRejected: () => void
  router: ReturnType<typeof useRouter>
}) {
  const data = parseNotificationData(n)

  return (
    <div className={`border-line bg-paper overflow-hidden rounded-2xl border ${!n.read ? 'border-l-sage border-l-2' : ''}`}>
      <div className='flex items-stretch'>
        <div className='flex flex-1 flex-col gap-3 px-5 py-4'>
          <div className='flex items-start gap-3'>
            <Avatar
              image={data.image}
              firstName={data.name}
              accentBg='bg-sage'
              size={36}
              initialClassName='text-sm font-medium'
            />
            <div className='flex flex-1 flex-col gap-0.5'>
              <span className='text-sm'>{bodyForType(n.type, data.name, data.groupName, locale)}</span>
              <span className='text-ink-faint text-xs'>{timeAgo(n.createdAt, locale)}</span>
            </div>
          </div>
          {n.type === 'group_invite' && (
            <InviteActions
              notificationId={n.id}
              locale={locale}
              onAccepted={onAccepted}
              onRejected={onRejected}
              router={router}
            />
          )}
        </div>
        <button
          type='button'
          onClick={onToggleExpand}
          aria-label={t(locale, 'notifications.ariaLabel')}
          aria-expanded={expanded}
          className={`text-ink-faint hover:text-ink-soft border-line flex w-12 shrink-0 items-center justify-center border-l leading-none transition-colors ${expanded ? 'bg-line/30' : ''}`}
        >
          <IconMore size={20} />
        </button>
      </div>
      {expanded && (
        <div className='border-line border-t'>
          <ConfirmActionSlot>
            {confirmingDelete ?
              <ConfirmRow
                key='confirm'
                label={t(locale, 'notifications.confirmDelete')}
                busy={false}
                cancelLabel={t(locale, 'notifications.cancel')}
                confirmLabel={t(locale, 'notifications.confirm')}
                onCancel={onCancelDelete}
                onConfirm={onConfirmDelete}
              />
            : <>
                <button
                  type='button'
                  key='toggle-read'
                  onClick={onToggleRead}
                  className='text-ink-soft hover:bg-line/40 flex min-h-12 w-full items-center justify-between px-5 text-sm transition-colors'
                >
                  <span>{n.read ? t(locale, 'notifications.markUnread') : t(locale, 'notifications.markRead')}</span>
                </button>
                <ConfirmTriggerRow
                  key='delete'
                  label={t(locale, 'notifications.delete')}
                  icon={<span aria-hidden>×</span>}
                  bordered
                  onClick={onRequestDelete}
                />
              </>
            }
          </ConfirmActionSlot>
        </div>
      )}
    </div>
  )
}

function InviteActions({
  notificationId,
  locale,
  onAccepted,
  onRejected,
  router
}: {
  notificationId: string
  locale: Locale
  onAccepted: () => void
  onRejected: () => void
  router: ReturnType<typeof useRouter>
}) {
  const accept = usePromiseStatus()
  const reject = usePromiseStatus()
  const busy = accept.status === 'pending' || reject.status === 'pending'
  const done = accept.status === 'success' || reject.status === 'success'

  const handleAccept = () => {
    void accept.run(async () => {
      const result = await acceptInviteFromNotification(notificationId)
      if (result.ok) {
        applyServerSnapshot(result.snapshot)
        onAccepted()
        router.push('/')
      }
    })
  }

  const handleReject = () => {
    void reject.run(async () => {
      await rejectInviteFromNotification(notificationId)
      onRejected()
    })
  }

  if (done) return null

  return (
    <div className='flex gap-2'>
      <Button
        variant='primary'
        size='xs'
        shape='pill'
        disabled={busy}
        status={accept.status}
        onClick={handleAccept}
        pendingLabel={t(locale, 'notifications.accepting')}
        successLabel={t(locale, 'notifications.accepted')}
      >
        {t(locale, 'notifications.accept')}
      </Button>
      <Button
        variant='ghost-destructive'
        size='xs'
        shape='pill'
        disabled={busy}
        status={reject.status}
        onClick={handleReject}
        pendingLabel={t(locale, 'notifications.rejecting')}
        successLabel={t(locale, 'notifications.rejected')}
      >
        {t(locale, 'notifications.reject')}
      </Button>
    </div>
  )
}

type ParsedData = { name: string; groupName: string; image: string | null }

function parseNotificationData(n: Notification): ParsedData {
  try {
    const d = JSON.parse(n.data) as Record<string, unknown>
    if (n.type === 'group_invite') {
      return {
        name: String(d.inviterFirstName ?? ''),
        groupName: String(d.groupName ?? ''),
        image: typeof d.inviterImage === 'string' ? d.inviterImage : null
      }
    }
    if (n.type === 'invite_accepted') {
      return {
        name: String(d.accepterFirstName ?? ''),
        groupName: String(d.groupName ?? ''),
        image: typeof d.accepterImage === 'string' ? d.accepterImage : null
      }
    }
    if (n.type === 'invite_rejected') {
      return {
        name: String(d.rejecterFirstName ?? ''),
        groupName: String(d.groupName ?? ''),
        image: typeof d.rejecterImage === 'string' ? d.rejecterImage : null
      }
    }
  } catch {}
  return { name: '', groupName: '', image: null }
}

function bodyForType(type: Notification['type'], name: string, groupName: string, locale: Locale): string {
  if (type === 'group_invite') return tf(locale, 'notifications.inviteBody', { name, group: groupName })
  if (type === 'invite_accepted') return tf(locale, 'notifications.inviteAcceptedBody', { name, group: groupName })
  return tf(locale, 'notifications.inviteRejectedBody', { name, group: groupName })
}

function timeAgo(ts: number, locale: Locale): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return t(locale, 'notifications.timeAgo.now')
  if (diff < 3_600_000) return tf(locale, 'notifications.timeAgo.minutes', { n: Math.floor(diff / 60_000) })
  if (diff < 86_400_000) return tf(locale, 'notifications.timeAgo.hours', { n: Math.floor(diff / 3_600_000) })
  return tf(locale, 'notifications.timeAgo.days', { n: Math.floor(diff / 86_400_000) })
}

function EmptyState({ locale }: { locale: Locale }) {
  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-4 py-16'>
      <div className='w-[48%] max-w-44'>
        <Image
          src='/notifications-empty-light.png'
          alt=''
          aria-hidden
          width={400}
          height={400}
          unoptimized
          className='theme-light-only h-auto w-full select-none'
          draggable={false}
        />
        <Image
          src='/notifications-empty-dark.png'
          alt=''
          aria-hidden
          width={400}
          height={400}
          unoptimized
          className='theme-dark-only h-auto w-full select-none'
          draggable={false}
        />
      </div>
      <div className='text-center'>
        <p className='font-display text-ink-soft text-base italic'>{t(locale, 'notifications.empty')}</p>
        <p className='text-ink-faint mt-1 text-xs'>{t(locale, 'notifications.emptyHint')}</p>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className='border-line bg-paper animate-pulse rounded-2xl border p-5'>
      <div className='flex gap-3'>
        <div className='bg-line h-9 w-9 rounded-full' />
        <div className='flex flex-1 flex-col gap-2'>
          <div className='bg-line h-4 w-3/4 rounded' />
          <div className='bg-line h-3 w-1/4 rounded' />
        </div>
      </div>
    </div>
  )
}
