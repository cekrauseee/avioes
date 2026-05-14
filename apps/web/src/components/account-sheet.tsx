'use client'

import { authClient } from '@airplanes/auth/client'
import { t } from '@airplanes/i18n'
import { getMemberColor, getMemberFirstName, getMemberFullName } from '@airplanes/types'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { getUserGroups, setActiveGroup } from '../actions'
import { resolveAvatarUrl } from '../lib/avatar'
import { MOTION_TRANSITION } from '../lib/motion'
import { applyLocalIdentity, applyServerSnapshot, selectLocale, useOfflineState } from '../lib/offline-store'
import { Avatar } from './avatar'
import { Button, ButtonLink, usePromiseStatus } from './button'
import { IconChevronRight, IconLogOut, IconPlus, IconUserPlus } from './icons'
import { Sheet } from './sheet'

type GroupEntry = { id: string; name: string; ownerId: string; memberCount: number }

const MAX_OTHERS = 2

export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const who = state.identity!
  const me = getMemberColor(who, state.groupMembers)
  const myFirstName = getMemberFirstName(who, state.groupMembers)
  const myFullName = getMemberFullName(who, state.groupMembers)
  const myMember = state.groupMembers.find((m) => m.userId === who)
  const myEmail = myMember?.email ?? ''
  const myImage = resolveAvatarUrl(myMember?.image ?? null)

  const [groups, setGroups] = useState<GroupEntry[]>([])
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const signOut = usePromiseStatus({ resetMs: 1400 })

  useEffect(() => {
    if (!open) return
    getUserGroups().then(setGroups)
  }, [open])

  const activeGroup = groups.find((g) => g.id === state.activeGroupId)
  const isOwner = activeGroup?.ownerId === who
  const others = groups.filter((g) => g.id !== state.activeGroupId)
  const displayed = others.slice(0, MAX_OTHERS)
  const hasMore = others.length > MAX_OTHERS

  const switchTo = (groupId: string) => {
    setSwitchingId(groupId)
    startTransition(async () => {
      try {
        const snapshot = await setActiveGroup(groupId)
        if (snapshot.activeGroupId) {
          applyServerSnapshot(snapshot)
          onClose()
          router.replace('/')
        }
      } finally {
        setSwitchingId(null)
      }
    })
  }

  const handleSignOut = () =>
    signOut.run(async () => {
      onClose()
      try {
        await authClient.signOut()
      } finally {
        applyLocalIdentity(null)
        router.replace('/auth')
        router.refresh()
      }
    })

  return (
    <Sheet
      open={open}
      onClose={onClose}
    >
      <div className='flex items-center gap-4 px-6 pt-3 pb-5'>
        <Avatar
          image={myImage}
          firstName={myFirstName}
          accentBg={me.bg}
          size={44}
          initialClassName='text-base font-medium'
        />
        <div className='min-w-0'>
          <p className='text-ink font-display text-lg leading-tight'>{myFullName}</p>
          <p className='text-ink-faint truncate text-xs'>{myEmail}</p>
        </div>
      </div>

      <div className='border-line mx-6 border-t' />

      <div className='px-6 pt-4 pb-2'>
        <p className='text-ink-faint mb-2 text-[11px]'>{t(locale, 'groups.sheet.otherGroups')}</p>

        {displayed.length === 0 ?
          <p className='text-ink-faint text-sm italic'>{t(locale, 'groups.sheet.onlyGroup')}</p>
        : <div className='flex flex-col gap-2'>
            {displayed.map((group) => (
              <Button
                key={group.id}
                variant='row'
                size='sm'
                fullWidth
                onClick={() => switchTo(group.id)}
                disabled={pending}
                leading={
                  <div className='flex min-w-0 flex-col items-start gap-0.5'>
                    <span className='font-display truncate text-base'>{group.name}</span>
                    <span className='text-ink-faint text-[11px]'>
                      {group.memberCount} {t(locale, group.memberCount === 1 ? 'groups.memberCount' : 'groups.memberCountPlural')}
                    </span>
                  </div>
                }
                trailing={
                  <span className='text-sage text-base leading-none'>
                    {switchingId === group.id ?
                      <motion.span
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={MOTION_TRANSITION.pulse}
                      >
                        …
                      </motion.span>
                    : <IconChevronRight size={14} />}
                  </span>
                }
              />
            ))}
          </div>
        }

        <div className='mt-3'>
          {hasMore ?
            <ButtonLink
              href='/groups'
              onClick={onClose}
              variant='row'
              size='md'
              fullWidth
              trailing={
                <span className='text-ink-faint text-base leading-none'>
                  <IconChevronRight size={14} />
                </span>
              }
            >
              {t(locale, 'groups.sheet.viewAll')}
            </ButtonLink>
          : <ButtonLink
              href='/groups/new'
              onClick={onClose}
              variant='row-accent'
              size='md'
              fullWidth
              trailing={
                <span className='text-base leading-none'>
                  <IconPlus size={14} />
                </span>
              }
            >
              {t(locale, 'groups.sheet.create')}
            </ButtonLink>
          }
        </div>
      </div>

      {isOwner && state.activeGroupId && (
        <>
          <div className='border-line mx-6 mt-3 border-t' />
          <div className='px-6 pt-3'>
            <ButtonLink
              href={`/groups/${state.activeGroupId}/manage`}
              onClick={onClose}
              variant='row-accent'
              size='md'
              fullWidth
              leading={<IconUserPlus size={16} />}
              trailing={<IconChevronRight size={14} />}
            >
              {t(locale, 'groups.sheet.invite')}
            </ButtonLink>
          </div>
        </>
      )}

      <div className='border-line mx-6 mt-3 border-t' />

      <div className='px-6 pt-3'>
        <Button
          variant='destructive-outline'
          size='md'
          fullWidth
          status={signOut.status}
          pendingLabel={t(locale, 'settings.signingOut')}
          successLabel={t(locale, 'settings.signedOut')}
          errorLabel={t(locale, 'settings.signOutError')}
          onClick={handleSignOut}
          leading={
            signOut.status === 'idle' ?
              <IconLogOut
                size={16}
                className='opacity-60'
              />
            : null
          }
        >
          {t(locale, 'groups.sheet.signOut')}
        </Button>
      </div>
    </Sheet>
  )
}
