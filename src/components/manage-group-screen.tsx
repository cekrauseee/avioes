'use client'

import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { addMemberByEmail, getGroupDetails, lookupUserToAdd, removeMember } from '../actions'
import type { GroupMember } from '../lib/types'
import { MEMBER_COLORS } from '../lib/types'

type LookupResult =
  | { email: string; ok: true; firstName: string; lastName: string | null }
  | { email: string; ok: false; error: string }

type LookupState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ready'; firstName: string; lastName: string | null; email: string }
  | { kind: 'error'; message: string }

const LOOKUP_DEBOUNCE_MS = 400

export function ManageGroupScreen({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [members, setMembers] = useState<GroupMember[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addSuccess, setAddSuccess] = useState(false)
  const [addPending, startAdd] = useTransition()
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const lookupTokenRef = useRef(0)
  const [removePending, startRemove] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmedEmail = addEmail.trim().toLowerCase()
  const validFormat = trimmedEmail.length > 0 && trimmedEmail.includes('@')
  const resultMatches = lookupResult?.email === trimmedEmail

  const lookup: LookupState =
    !validFormat ? { kind: 'idle' }
    : !resultMatches || !lookupResult ? { kind: 'checking' }
    : lookupResult.ok ?
      { kind: 'ready', firstName: lookupResult.firstName, lastName: lookupResult.lastName, email: lookupResult.email }
    : { kind: 'error', message: lookupResult.error }

  useEffect(() => {
    getGroupDetails(groupId).then((data) => {
      if (data) {
        setMembers(data.members)
        setIsOwner(data.isOwner)
      }
      setLoaded(true)
    })
  }, [groupId])

  useEffect(() => {
    if (!validFormat) return
    if (lookupResult?.email === trimmedEmail) return

    const token = ++lookupTokenRef.current
    const timer = setTimeout(async () => {
      const result = await lookupUserToAdd(groupId, trimmedEmail)
      if (token !== lookupTokenRef.current) return
      if (result.ok) setLookupResult({ email: trimmedEmail, ok: true, firstName: result.firstName, lastName: result.lastName })
      else setLookupResult({ email: trimmedEmail, ok: false, error: result.error })
    }, LOOKUP_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [trimmedEmail, validFormat, groupId, lookupResult])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (lookup.kind !== 'ready') return
    setAddSuccess(false)
    startAdd(async () => {
      const result = await addMemberByEmail(groupId, lookup.email)
      if ('error' in result) {
        setLookupResult({ email: lookup.email, ok: false, error: result.error })
        return
      }
      setAddSuccess(true)
      setAddEmail('')
      lookupTokenRef.current++
      setLookupResult(null)
      const refreshed = await getGroupDetails(groupId)
      if (refreshed) setMembers(refreshed.members)
    })
  }

  const handleRemove = (userId: string) => {
    setRemovingId(userId)
    startRemove(async () => {
      try {
        const result = await removeMember(groupId, userId)
        if ('error' in result) return
        const refreshed = await getGroupDetails(groupId)
        if (refreshed) setMembers(refreshed.members)
      } finally {
        setRemovingId(null)
        setExpandedId(null)
        setConfirmingRemove(null)
      }
    })
  }

  const toggleExpanded = (userId: string) => {
    setExpandedId((prev) => (prev === userId ? null : userId))
    setConfirmingRemove(null)
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
          <span className='text-ink-faint font-display text-sm italic'>aviões</span>
          <button
            type='button'
            onClick={() => router.back()}
            className='border-line bg-paper text-ink-soft hover:bg-line/40 focus-visible:bg-line/40 focus-visible:ring-sage/40 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]'
          >
            <span aria-hidden>←</span>
            <span>voltar</span>
          </button>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className='mt-10'
        >
          <h1 className='font-display text-[34px] leading-[0.93] tracking-tight'>
            membros do
            <br />
            <span className='text-clay italic'>grupo</span>
          </h1>
        </motion.div>

        {/* Add member form (owner only) */}
        {isOwner && (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleAdd}
            className='mt-8 flex flex-col gap-2'
          >
            <label className='text-ink-faint text-xs'>adicionar por e-mail</label>
            <div className='flex gap-2'>
              <input
                ref={inputRef}
                type='email'
                value={addEmail}
                onChange={(e) => {
                  setAddEmail(e.target.value)
                  setAddSuccess(false)
                }}
                placeholder='alguém@exemplo.com'
                className='border-line bg-paper text-ink placeholder:text-ink-faint ring-sage/40 min-h-12 min-w-0 flex-1 rounded-xl border px-4 text-sm transition-all outline-none focus:ring-2'
              />
              <button
                type='submit'
                disabled={addPending || lookup.kind !== 'ready'}
                className='bg-sage text-bg focus-visible:ring-sage/40 min-h-12 shrink-0 rounded-xl px-4 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] disabled:opacity-50'
              >
                {addPending ?
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    …
                  </motion.span>
                : 'adicionar'}
              </button>
            </div>
            {lookup.kind === 'checking' && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className='text-ink-faint text-xs'
              >
                procurando…
              </motion.p>
            )}
            {lookup.kind === 'ready' && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className='text-sage text-xs'
              >
                encontrado: <span className='text-ink-soft'>{lookup.lastName ? `${lookup.firstName} ${lookup.lastName}` : lookup.firstName}</span>
              </motion.p>
            )}
            {lookup.kind === 'error' && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className='text-clay text-xs'
              >
                {lookup.message}
              </motion.p>
            )}
            {addSuccess && lookup.kind === 'idle' && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className='text-sage text-xs'
              >
                membro adicionado ✓
              </motion.p>
            )}
          </motion.form>
        )}
      </div>

      {/* Members list */}
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
        : <div className='flex flex-col gap-2'>
            {members.map((member, index) => (
              <motion.div
                key={member.userId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <MemberRow
                  member={member}
                  colorIndex={index}
                  isOwner={isOwner}
                  expanded={expandedId === member.userId}
                  confirming={confirmingRemove === member.userId}
                  isRemoving={removingId === member.userId}
                  pending={removePending}
                  onToggle={() => toggleExpanded(member.userId)}
                  onAskRemove={() => setConfirmingRemove(member.userId)}
                  onCancelRemove={() => setConfirmingRemove(null)}
                  onConfirmRemove={() => handleRemove(member.userId)}
                />
              </motion.div>
            ))}
          </div>
        }
      </motion.div>
    </div>
  )
}

function MemberRow({
  member,
  colorIndex,
  isOwner,
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
          {member.image ?
            <Image
              src={member.image}
              alt=''
              width={28}
              height={28}
              unoptimized
              referrerPolicy='no-referrer'
              className='h-7 w-7 shrink-0 rounded-full object-cover'
            />
          : <div className={`h-7 w-7 shrink-0 rounded-full ${color.bg} flex items-center justify-center`}>
              <span className='text-bg text-xs font-medium'>{member.firstName.slice(0, 1).toUpperCase()}</span>
            </div>
          }
          <div className='min-w-0 flex-1'>
            <p className='text-ink truncate text-sm font-medium'>{member.lastName ? `${member.firstName} ${member.lastName}` : member.firstName}</p>
            <p className='text-ink-faint truncate text-xs'>{member.email}</p>
          </div>
          <span className={`text-xs ${color.text} shrink-0`}>{member.role === 'owner' ? 'dono' : 'membro'}</span>
        </div>
        {canRemove && (
          <button
            type='button'
            onClick={onToggle}
            aria-label='ações'
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
                label='remover do grupo?'
                busy={isRemoving}
                pending={pending}
                onCancel={onCancelRemove}
                onConfirm={onConfirmRemove}
              />
            : <button
                type='button'
                disabled={pending}
                onClick={onAskRemove}
                className='text-clay hover:bg-clay/8 flex min-h-12 w-full items-center justify-between px-4 text-sm transition-colors disabled:opacity-50'
              >
                <span>remover do grupo</span>
                <span>×</span>
              </button>
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
  onCancel,
  onConfirm
}: {
  label: string
  busy: boolean
  pending: boolean
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
        <button
          type='button'
          onClick={onCancel}
          disabled={busy}
          className='text-ink-soft hover:bg-line/40 min-h-16 text-sm transition-colors disabled:opacity-50'
        >
          cancelar
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
          : 'confirmar'}
        </button>
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
