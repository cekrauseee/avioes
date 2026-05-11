'use client'

import { useEffect, useState } from 'react'
import { authClient } from '../lib/auth-client'
import { t } from '../lib/i18n'
import type { Locale } from '../lib/types'
import { GoogleMark } from './auth-screen'
import { Button, ButtonLink } from './button'
import { ConfirmActionSlot, ConfirmRow, ConfirmTriggerRow } from './confirm-row'
import { ExpandableItem } from './expandable-item'
import { IconChevronRight, IconLink, IconX } from './icons'
import { Sheet } from './sheet'
import { Skel } from './skeleton'

type LinkedAccount = { providerId: string }

export function ConnectionsSheet({
  open,
  onClose,
  locale,
  initialError
}: {
  open: boolean
  onClose: () => void
  locale: Locale
  initialError?: string | null
}) {
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null)
  const [hasPasskey, setHasPasskey] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [unlinkError, setUnlinkError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!open) return
    authClient.listAccounts().then((res) => {
      if (res.data) setAccounts(res.data)
    })
    authClient.passkey.listUserPasskeys().then((res) => {
      setHasPasskey((res.data?.length ?? 0) > 0)
    })
  }, [open])

  const googleLinked = accounts?.some((a) => a.providerId === 'google') ?? false
  const hasCredential = accounts?.some((a) => a.providerId === 'credential') ?? false
  const googleOnly = googleLinked && !hasCredential && !hasPasskey

  const toggleExpanded = () => {
    setExpanded((p) => !p)
    setConfirming(false)
    setUnlinkError(null)
  }

  const handleUnlinkGoogle = async () => {
    setUnlinking(true)
    setUnlinkError(null)
    const res = await authClient.unlinkAccount({ providerId: 'google' })
    if (res.error) {
      setUnlinkError(res.error.message ?? t(locale, 'settings.unlinkError'))
      setUnlinking(false)
      return
    }
    setAccounts((prev) => prev?.filter((a) => a.providerId !== 'google') ?? null)
    setUnlinking(false)
    setConfirming(false)
    setExpanded(false)
  }

  const handleLinkGoogle = () => {
    authClient.linkSocial({
      provider: 'google',
      callbackURL: '/settings?tab=account&connections=open',
      errorCallbackURL: '/settings?tab=account&connections=open'
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
    >
      <div className='px-6 pt-4 pb-2'>
        <div className='flex items-center gap-2'>
          <IconLink size={18} className='text-ink-soft' />
          <p className='font-display text-ink text-lg'>{t(locale, 'settings.connections')}</p>
        </div>
        <p className='text-ink-faint mt-1 text-xs'>{t(locale, 'settings.connectionsSheetSubtitle')}</p>
      </div>

      <div className='flex flex-col gap-2.5 px-6 pt-4'>
        {accounts === null ?
          <Skel className='h-12 w-full rounded-2xl' />
        : googleLinked ?
          <ExpandableItem
            expanded={expanded}
            onToggle={toggleExpanded}
            toggleAriaLabel={t(locale, 'settings.googleDisconnect')}
            main={
              <div className='flex flex-1 items-center gap-2.5 px-5 py-4'>
                <GoogleMark />
                <span className='text-ink-soft text-sm'>{t(locale, 'settings.googleConnected')}</span>
              </div>
            }
          >
            {googleOnly ?
              <ButtonLink
                href='/settings/password?reason=google'
                variant='ghost-destructive'
                size='sm'
                shape='square'
                fullWidth
                className='px-5'
                trailing={
                  <IconChevronRight
                    size={14}
                    className='text-ink-faint'
                  />
                }
              >
                {t(locale, 'settings.googleDisconnect')}
              </ButtonLink>
            : <ConfirmActionSlot>
                {confirming ?
                  <ConfirmRow
                    key='confirm'
                    label={t(locale, 'settings.googleConfirm')}
                    busy={unlinking}
                    cancelLabel={t(locale, 'settings.cancel')}
                    confirmLabel={t(locale, 'settings.confirm')}
                    onCancel={() => setConfirming(false)}
                    onConfirm={handleUnlinkGoogle}
                  />
                : <ConfirmTriggerRow
                    key='disconnect'
                    label={t(locale, 'settings.googleDisconnect')}
                    icon={<IconX size={14} />}
                    onClick={() => setConfirming(true)}
                  />
                }
              </ConfirmActionSlot>
            }
            {unlinkError && <p className='text-clay border-line border-t px-5 py-2 text-[11px]'>{unlinkError}</p>}
          </ExpandableItem>
        : <Button
            variant='row'
            size='md'
            shape='square'
            fullWidth
            onClick={handleLinkGoogle}
            className='rounded-2xl px-5 py-4'
            leading={
              <div className='flex items-center gap-2.5'>
                <GoogleMark />
                <span className='text-sm'>{t(locale, 'settings.googleConnect')}</span>
              </div>
            }
            trailing={
              <IconChevronRight
                size={14}
                className='text-ink-faint'
              />
            }
          />
        }
        {initialError && !googleLinked && <p className='text-clay px-1 text-[11px]'>{initialError}</p>}
      </div>

      <div className='flex flex-col gap-2 px-6 pt-4'>
        <Button
          variant='secondary'
          size='md'
          fullWidth
          onClick={onClose}
        >
          {t(locale, 'settings.done')}
        </Button>
      </div>
    </Sheet>
  )
}
