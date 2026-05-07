'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { cancelInvitation, createInvitation, getGroupDetailsWithInvites, removeMember } from '../actions'
import { resolveAvatarUrl } from '../lib/avatar'
import { t } from '../lib/i18n'
import { selectLocale, useOfflineState } from '../lib/offline-store'
import type { GroupMember, Locale } from '../lib/types'
import { MEMBER_COLORS } from '../lib/types'
import { AnimatedList, AnimatedListItem } from './animated-list'
import { Avatar } from './avatar'
import { Button } from './button'
import { InviteShareSheet } from './invite-share-sheet'

type PendingInvite = { id: string; invitedEmail: string; createdAt: number; expiresAt: number }

export function ManageGroupScreen({ groupId }: { groupId: string }) {
  const router = useRouter()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [invitePending, startInvite] = useTransition()
  const [removePending, startRemove] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null)
  const [confirmingCancelInvite, setConfirmingCancelInvite] = useState<string | null>(null)
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null)
  const [cancelPending, startCancel] = useTransition()
  const [shareSheet, setShareSheet] = useState<{ open: boolean; url: string; email: string }>({ open: false, url: '', email: '' })
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmedEmail = inviteEmail.trim().toLowerCase()
  const validFormat = trimmedEmail.length > 0 && trimmedEmail.includes('@')

  useEffect(() => {
    getGroupDetailsWithInvites(groupId).then((data) => {
      if (data) {
        setMembers(data.members)
        setIsOwner(data.isOwner)
        setPendingInvites(data.pendingInvitations)
      }
      setLoaded(true)
    })
  }, [groupId])

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validFormat) return
    setInviteError(null)
    startInvite(async () => {
      const result = await createInvitation(groupId, trimmedEmail)
      if (!result.ok) {
        if (result.error === 'already_member') setInviteError(t(locale, 'groups.manage.alreadyMember'))
        else if (result.error === 'rate_limited') setInviteError(t(locale, 'groups.manage.inviteRateLimited'))
        else setInviteError(t(locale, 'groups.manage.inviteError'))
        return
      }
      setInviteEmail('')
      setShareSheet({ open: true, url: result.inviteUrl, email: trimmedEmail })
      const refreshed = await getGroupDetailsWithInvites(groupId)
      if (refreshed) {
        setMembers(refreshed.members)
        setPendingInvites(refreshed.pendingInvitations)
      }
    })
  }

  const handleRemove = (userId: string) => {
    setRemovingId(userId)
    startRemove(async () => {
      try {
        const result = await removeMember(groupId, userId)
        if ('error' in result) return
        const refreshed = await getGroupDetailsWithInvites(groupId)
        if (refreshed) {
          setMembers(refreshed.members)
          setPendingInvites(refreshed.pendingInvitations)
        }
      } finally {
        setRemovingId(null)
        setExpandedId(null)
        setConfirmingRemove(null)
      }
    })
  }

  const handleCancelInvite = (inviteId: string) => {
    setCancellingInviteId(inviteId)
    startCancel(async () => {
      try {
        await cancelInvitation(groupId, inviteId)
        const refreshed = await getGroupDetailsWithInvites(groupId)
        if (refreshed) setPendingInvites(refreshed.pendingInvitations)
      } finally {
        setCancellingInviteId(null)
        setExpandedId(null)
        setConfirmingCancelInvite(null)
      }
    })
  }

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
    setConfirmingRemove(null)
    setConfirmingCancelInvite(null)
  }

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='flex flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)]'>
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
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
            {t(locale, 'groups.manage.back')}
          </Button>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className='mt-10'
        >
          <h1 className='font-display text-[34px] leading-[0.93] tracking-tight'>
            {t(locale, 'groups.manage.membersOfLine1')}
            <br />
            <span className='text-clay italic'>{t(locale, 'groups.manage.membersOfItalic')}</span>
          </h1>
        </motion.div>

        {isOwner && (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleInvite}
            className='mt-8 flex flex-col gap-2'
          >
            <label className='text-ink-faint text-xs'>{t(locale, 'groups.manage.inviteLabel')}</label>
            <div className='flex gap-2'>
              <input
                ref={inputRef}
                type='email'
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value)
                  setInviteError(null)
                }}
                placeholder={t(locale, 'groups.manage.invitePlaceholder')}
                className='border-line bg-paper text-ink placeholder:text-ink-faint ring-sage/40 min-h-12 min-w-0 flex-1 rounded-xl border px-4 text-sm transition-all outline-none focus:ring-2'
              />
              <Button
                type='submit'
                variant='primary'
                size='md'
                className='shrink-0'
                disabled={!validFormat}
                status={invitePending ? 'pending' : 'idle'}
                pendingLabel='…'
              >
                {t(locale, 'groups.manage.invite')}
              </Button>
            </div>
            {inviteError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className='text-clay text-xs'
              >
                {inviteError}
              </motion.p>
            )}
          </motion.form>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className='scroll-area mt-6 flex-1 overflow-y-auto px-6 pb-[max(env(safe-area-inset-bottom),2rem)]'
      >
        {!loaded ?
          <div className='flex flex-col gap-3'>
            <SkeletonMember />
            <SkeletonMember />
          </div>
        : <AnimatedList className='flex flex-col gap-2'>
            {members.map((member, index) => (
              <AnimatedListItem
                key={member.userId}
                enterDelay={0.3 + index * 0.05}
              >
                <MemberRow
                  member={member}
                  colorIndex={index}
                  isOwner={isOwner}
                  locale={locale}
                  expanded={expandedId === member.userId}
                  confirming={confirmingRemove === member.userId}
                  isRemoving={removingId === member.userId}
                  pending={removePending}
                  onToggle={() => toggleExpanded(member.userId)}
                  onAskRemove={() => setConfirmingRemove(member.userId)}
                  onCancelRemove={() => setConfirmingRemove(null)}
                  onConfirmRemove={() => handleRemove(member.userId)}
                />
              </AnimatedListItem>
            ))}
            {pendingInvites.map((invite, index) => (
              <AnimatedListItem
                key={`invite-${invite.id}`}
                enterDelay={0.3 + (members.length + index) * 0.05}
              >
                <InviteRow
                  invite={invite}
                  locale={locale}
                  expanded={expandedId === `invite-${invite.id}`}
                  confirming={confirmingCancelInvite === invite.id}
                  isCancelling={cancellingInviteId === invite.id}
                  pending={cancelPending}
                  onToggle={() => toggleExpanded(`invite-${invite.id}`)}
                  onAskCancel={() => setConfirmingCancelInvite(invite.id)}
                  onCancelCancel={() => setConfirmingCancelInvite(null)}
                  onConfirmCancel={() => handleCancelInvite(invite.id)}
                />
              </AnimatedListItem>
            ))}
          </AnimatedList>
        }
      </motion.div>

      <InviteShareSheet
        open={shareSheet.open}
        onClose={() => setShareSheet((s) => ({ ...s, open: false }))}
        inviteUrl={shareSheet.url}
        email={shareSheet.email}
      />
    </div>
  )
}

function MemberRow({
  member,
  colorIndex,
  isOwner,
  locale,
  expanded,
  confirming,
  isRemoving,
  pending,
  onToggle,
  onAskRemove,
  onCancelRemove,
  onConfirmRemove
}: {
  member: GroupMember
  colorIndex: number
  isOwner: boolean
  locale: Locale
  expanded: boolean
  confirming: boolean
  isRemoving: boolean
  pending: boolean
  onToggle: () => void
  onAskRemove: () => void
  onCancelRemove: () => void
  onConfirmRemove: () => void
}) {
  const color = MEMBER_COLORS[colorIndex % MEMBER_COLORS.length]
  const canRemove = isOwner && member.role !== 'owner'

  return (
    <div className='border-line bg-paper overflow-hidden rounded-xl border'>
      <div className='flex items-stretch'>
        <div className='flex flex-1 items-center gap-3 px-4 py-3'>
          <Avatar
            image={resolveAvatarUrl(member.image)}
            firstName={member.firstName}
            accentBg={color.bg}
            size={28}
            initialClassName='text-xs font-medium'
          />
          <div className='min-w-0 flex-1'>
            <p className='text-ink truncate text-sm font-medium'>{member.lastName ? `${member.firstName} ${member.lastName}` : member.firstName}</p>
            <p className='text-ink-faint truncate text-xs'>{member.email}</p>
          </div>
          <span className={`text-xs ${color.text} shrink-0`}>
            {member.role === 'owner' ? t(locale, 'groups.manage.owner') : t(locale, 'groups.manage.member')}
          </span>
        </div>
        {canRemove && (
          <button
            type='button'
            onClick={onToggle}
            aria-label={t(locale, 'groups.manage.actions')}
            aria-expanded={expanded}
            className={`text-ink-faint hover:text-ink-soft border-line flex w-16 shrink-0 items-center justify-center border-l text-2xl leading-none transition-colors ${expanded ? 'bg-line/30' : ''}`}
          >
            ⋯
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && canRemove && (
          <motion.div
            key='actions'
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className='border-line border-t'
          >
            {confirming ?
              <ConfirmRow
                label={t(locale, 'groups.manage.confirmRemove')}
                busy={isRemoving}
                pending={pending}
                locale={locale}
                onCancel={onCancelRemove}
                onConfirm={onConfirmRemove}
              />
            : <Button
                variant='ghost-destructive'
                size='md'
                shape='square'
                fullWidth
                className='px-4'
                disabled={pending}
                onClick={onAskRemove}
                trailing={<span>×</span>}
              >
                {t(locale, 'groups.manage.removeFromGroup')}
              </Button>
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function InviteRow({
  invite,
  locale,
  expanded,
  confirming,
  isCancelling,
  pending,
  onToggle,
  onAskCancel,
  onCancelCancel,
  onConfirmCancel
}: {
  invite: PendingInvite
  locale: Locale
  expanded: boolean
  confirming: boolean
  isCancelling: boolean
  pending: boolean
  onToggle: () => void
  onAskCancel: () => void
  onCancelCancel: () => void
  onConfirmCancel: () => void
}) {
  return (
    <div className='border-line bg-paper overflow-hidden rounded-xl border opacity-70'>
      <div className='flex items-stretch'>
        <div className='flex flex-1 items-center gap-3 px-4 py-3'>
          <div className='bg-line flex h-7 w-7 shrink-0 items-center justify-center rounded-full'>
            <span className='text-ink-faint text-xs'>✉</span>
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-ink truncate text-sm'>{invite.invitedEmail}</p>
          </div>
          <span className='text-ink-faint shrink-0 text-xs'>{t(locale, 'groups.manage.invited')}</span>
        </div>
        <button
          type='button'
          onClick={onToggle}
          aria-label={t(locale, 'groups.manage.actions')}
          aria-expanded={expanded}
          className={`text-ink-faint hover:text-ink-soft border-line flex w-16 shrink-0 items-center justify-center border-l text-2xl leading-none transition-colors ${expanded ? 'bg-line/30' : ''}`}
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
            {confirming ?
              <ConfirmRow
                label={t(locale, 'groups.manage.confirmCancelInvite')}
                busy={isCancelling}
                pending={pending}
                locale={locale}
                onCancel={onCancelCancel}
                onConfirm={onConfirmCancel}
              />
            : <Button
                variant='ghost-destructive'
                size='md'
                shape='square'
                fullWidth
                className='px-4'
                disabled={pending}
                onClick={onAskCancel}
                trailing={<span>×</span>}
              >
                {t(locale, 'groups.manage.cancelInvite')}
              </Button>
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ConfirmRow({
  label,
  busy,
  pending,
  locale,
  onCancel,
  onConfirm
}: {
  label: string
  busy: boolean
  pending: boolean
  locale: Locale
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className='flex flex-col'
    >
      <span className='text-clay px-4 pt-3 pb-2 text-sm'>{label}</span>
      <div className='border-line grid grid-cols-2 border-t'>
        <Button
          variant='ghost'
          size='md'
          shape='square'
          className='min-h-16'
          disabled={busy}
          onClick={onCancel}
        >
          {t(locale, 'groups.manage.cancel')}
        </Button>
        <Button
          variant='destructive'
          size='md'
          shape='square'
          className='border-line min-h-16 border-l disabled:opacity-60'
          disabled={pending}
          onClick={onConfirm}
          status={busy ? 'pending' : 'idle'}
          pendingLabel='…'
        >
          {t(locale, 'groups.manage.confirm')}
        </Button>
      </div>
    </motion.div>
  )
}

function SkeletonMember() {
  return (
    <div className='border-line flex animate-pulse items-center gap-3 rounded-xl border px-4 py-3'>
      <div className='bg-line h-7 w-7 rounded-full' />
      <div className='flex flex-1 flex-col gap-1.5'>
        <div className='bg-line h-4 w-28 rounded' />
        <div className='bg-line h-3 w-40 rounded' />
      </div>
    </div>
  )
}
