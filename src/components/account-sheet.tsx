'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { getUserGroups, setActiveGroup } from '../actions'
import { authClient } from '../lib/auth-client'
import { resolveAvatarUrl } from '../lib/avatar'
import { t } from '../lib/i18n'
import { applyLocalIdentity, applyServerSnapshot, selectLocale, useOfflineState } from '../lib/offline-store'
import { getMemberColor, getMemberFirstName, getMemberFullName } from '../lib/types'
import { Avatar } from './avatar'
import { Button, ButtonLink } from './button'

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

  const handleSignOut = async () => {
    onClose()
    await authClient.signOut()
    applyLocalIdentity(null)
    router.replace('/auth')
    router.refresh()
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key='backdrop'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className='bg-ink/20 fixed inset-0 z-40'
          />
          <motion.div
            key='sheet'
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className='bg-bg fixed right-0 bottom-0 left-0 z-50 mx-auto w-full max-w-[630px] rounded-t-2xl'
          >
            {/* drag handle */}
            <div className='flex justify-center pt-3 pb-1'>
              <div className='bg-line h-1 w-10 rounded-full' />
            </div>

            {/* user identity */}
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

            {/* other groups quick switch */}
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
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              …
                            </motion.span>
                          : '→'}
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
                    trailing={<span className='text-ink-faint text-base leading-none'>→</span>}
                  >
                    {t(locale, 'groups.sheet.viewAll')}
                  </ButtonLink>
                : <ButtonLink
                    href='/groups/new'
                    onClick={onClose}
                    variant='row-accent'
                    size='md'
                    fullWidth
                    trailing={<span className='text-base leading-none'>+</span>}
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
                    trailing={<span className='text-base leading-none'>+</span>}
                  >
                    {t(locale, 'groups.sheet.invite')}
                  </ButtonLink>
                </div>
              </>
            )}

            <div className='border-line mx-6 mt-3 border-t' />

            {/* sign out */}
            <div className='px-6 pt-3 pb-[max(env(safe-area-inset-bottom),1.5rem)]'>
              <Button
                variant='destructive-outline'
                size='md'
                fullWidth
                align='between'
                onClick={handleSignOut}
                trailing={<span className='text-base leading-none opacity-70'>→</span>}
              >
                {t(locale, 'groups.sheet.signOut')}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
