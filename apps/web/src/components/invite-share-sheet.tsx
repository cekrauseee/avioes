'use client'

import { useCallback, useEffect, useState } from 'react'
import { sendInvitationEmail } from '../actions'
import { t, tf } from '@airplanes/i18n'
import { selectLocale, useOfflineState } from '../lib/offline-store'
import { Button, usePromiseStatus } from './button'
import { IconCopy, IconMail, IconSend, IconShare } from './icons'
import { Sheet } from './sheet'

export function InviteShareSheet({
  open,
  onClose,
  inviteUrl,
  email,
  groupId,
  groupName
}: {
  open: boolean
  onClose: () => void
  inviteUrl: string
  email: string
  groupId: string
  groupName: string
}) {
  const state = useOfflineState()
  const locale = selectLocale(state)
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const emailStatus = usePromiseStatus({ resetMs: 2000 })

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(id)
  }, [copied])

  const handleSendEmail = () =>
    emailStatus.run(async () => {
      const result = await sendInvitationEmail(groupId, email, inviteUrl)
      if (!result.ok) throw new Error(result.error)
    })

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
    } catch {}
  }, [inviteUrl])

  const handleShare = useCallback(async () => {
    try {
      await navigator.share({
        title: tf(locale, 'invite.share.shareTitle', { group: groupName }),
        text: tf(locale, 'invite.share.shareText', { group: groupName }),
        url: inviteUrl
      })
    } catch {}
  }, [inviteUrl, locale, groupName])

  return (
    <Sheet
      open={open}
      onClose={onClose}
    >
      <div className='px-6 pt-4 pb-2'>
        <div className='flex items-center gap-2'>
          <IconSend
            size={18}
            className='text-ink-soft'
          />
          <p className='font-display text-ink text-lg'>{t(locale, 'invite.share.title')}</p>
        </div>
        <p className='text-ink-faint mt-1 text-xs'>{email}</p>
      </div>

      <div className='mx-6 mt-2 rounded-xl bg-[var(--color-line)]/10 px-4 py-3'>
        <p className='text-ink-soft font-mono text-xs break-all'>{inviteUrl}</p>
      </div>

      <div className='px-6 pt-3 pb-1'>
        <p className='text-ink-faint text-xs'>{t(locale, 'invite.share.subtitle')}</p>
      </div>

      <div className='flex flex-col gap-2 px-6 pt-2'>
        <Button
          variant='primary'
          size='md'
          fullWidth
          status={emailStatus.status}
          pendingLabel={t(locale, 'invite.share.sendingEmail')}
          successLabel={t(locale, 'invite.share.emailSent')}
          errorLabel={t(locale, 'invite.share.emailError')}
          onClick={handleSendEmail}
          leading={emailStatus.status === 'idle' ? <IconMail size={16} /> : null}
        >
          {t(locale, 'invite.share.sendEmail')}
        </Button>
        <Button
          variant='secondary'
          size='md'
          fullWidth
          status={copied ? 'success' : 'idle'}
          successLabel={t(locale, 'invite.share.copied')}
          onClick={handleCopy}
          leading={!copied ? <IconCopy size={16} /> : null}
        >
          {t(locale, 'invite.share.copy')}
        </Button>
        {canShare && (
          <Button
            variant='secondary'
            size='md'
            fullWidth
            onClick={handleShare}
            leading={<IconShare size={16} />}
          >
            {t(locale, 'invite.share.share')}
          </Button>
        )}
        <Button
          variant='ghost'
          size='md'
          fullWidth
          onClick={onClose}
        >
          {t(locale, 'invite.share.done')}
        </Button>
      </div>
    </Sheet>
  )
}
