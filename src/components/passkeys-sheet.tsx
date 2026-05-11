'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { authClient } from '../lib/auth-client'
import { t } from '../lib/i18n'
import { MOTION_TRANSITION } from '../lib/motion'
import type { Locale } from '../lib/types'
import { AnimatedLayoutBlock, AnimatedList, AnimatedListGroup, AnimatedListItem } from './animated-list'
import { Button } from './button'
import { ConfirmActionSlot, ConfirmRow, ConfirmTriggerRow } from './confirm-row'
import { ExpandableItem } from './expandable-item'
import { IconX } from './icons'
import { Skel } from './skeleton'

type PasskeyEntry = { id: string; name: string | null; aaguid: string | null; createdAt: Date | null }

// Source: passkeydeveloper/passkey-authenticator-aaguids (GitHub), May 2026
const AAGUID_NAMES: Record<string, string> = {
  'fbfc3007-154e-4ecc-8c0b-6e020557d7bd': 'iCloud Keychain',
  'dd4ec289-e01d-41c9-bb89-70fa845d4bf2': 'iCloud Keychain',
  'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': 'Google Password Manager',
  'b93fd961-f2e6-462f-b122-82002247de78': 'Android',
  '08987058-cadc-4b81-b6e1-30de50dcbe96': 'Windows Hello',
  '6028b017-b1d4-4c02-b4b3-afcdafc96bb2': 'Windows Hello',
  '9ddd1817-af5a-4672-a2b9-3e3dd95000a9': 'Windows Hello',
  'adce0002-35bc-c60a-648b-0b25f1f05503': 'Chrome on Mac',
  'bada5566-a7aa-401f-bd96-45619a55120d': '1Password',
  'd548826e-79b4-db40-a3d8-11116f7e8349': 'Bitwarden',
  'f3809540-7f14-49c1-a8b3-8f813b225541': 'Dashlane',
  '53414d53-554e-4700-0000-000000000000': 'Samsung Pass'
}

function passkeyLabel(pk: PasskeyEntry, locale: Locale): string {
  if (pk.name) return pk.name
  if (pk.aaguid && AAGUID_NAMES[pk.aaguid]) return AAGUID_NAMES[pk.aaguid]
  return t(locale, 'settings.passkeyGenericName')
}

export function PasskeysSheet({ open, onClose, locale }: { open: boolean; onClose: () => void; locale: Locale }) {
  const [passkeys, setPasskeys] = useState<PasskeyEntry[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    authClient.passkey.listUserPasskeys().then((res) => {
      if (res.data) setPasskeys(res.data as PasskeyEntry[])
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
    setConfirmingId(null)
    setError(null)
  }

  const handleAdd = async () => {
    setAdding(true)
    setError(null)
    const res = await authClient.passkey.addPasskey()
    if (res?.error) {
      setAdding(false)
      const code = 'code' in res.error ? res.error.code : undefined
      if (code === 'ERROR_CEREMONY_ABORTED') return
      if (code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
        setError(t(locale, 'settings.passkeyAlreadyRegistered'))
        return
      }
      setError(t(locale, 'settings.passkeyAddError'))
      return
    }
    const refreshed = await authClient.passkey.listUserPasskeys()
    if (refreshed.data) setPasskeys(refreshed.data as PasskeyEntry[])
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setError(null)
    const res = await authClient.passkey.deletePasskey({ id })
    if (res?.error) {
      setError(t(locale, 'settings.passkeyDeleteError'))
      setDeletingId(null)
      return
    }
    setPasskeys((prev) => prev?.filter((p) => p.id !== id) ?? null)
    setDeletingId(null)
    setConfirmingId(null)
    setExpandedId(null)
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
            transition={MOTION_TRANSITION.sheetBackdrop}
            onClick={onClose}
            className='bg-ink/20 fixed inset-0 z-40'
          />
          <motion.div
            key='sheet'
            layout='position'
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              ...MOTION_TRANSITION.sheetPanel,
              layout: MOTION_TRANSITION.sheetLayout
            }}
            className='bg-bg fixed right-0 bottom-0 left-0 z-50 mx-auto w-full max-w-[630px] rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1.25rem)]'
          >
            <div className='flex justify-center pt-3 pb-1'>
              <div className='bg-line h-1 w-10 rounded-full' />
            </div>

            <div className='px-6 pt-4 pb-2'>
              <p className='font-display text-ink text-lg'>{t(locale, 'settings.passkeys')}</p>
              <p className='text-ink-faint mt-1 text-xs'>{t(locale, 'settings.passkeysSheetSubtitle')}</p>
            </div>

            <AnimatedListGroup>
              <AnimatedList
                mode='wait'
                className='flex flex-col gap-2.5 px-6 pt-4'
              >
                {passkeys === null ?
                  <Skel
                    key='loading'
                    className='h-14 w-full rounded-2xl'
                  />
                : passkeys.map((pk) => {
                    const expanded = expandedId === pk.id
                    const confirming = confirmingId === pk.id
                    const busy = deletingId === pk.id
                    return (
                      <AnimatedListItem key={pk.id}>
                        <ExpandableItem
                          expanded={expanded}
                          onToggle={() => toggleExpanded(pk.id)}
                          toggleAriaLabel={t(locale, 'settings.passkeyActions')}
                          main={
                            <div className='flex flex-1 flex-col gap-0.5 px-5 py-3.5'>
                              <span className='text-ink text-sm'>{passkeyLabel(pk, locale)}</span>
                              {pk.createdAt && (
                                <span className='text-ink-faint text-xs'>
                                  {t(locale, 'settings.passkeyCreated')}{' '}
                                  {pk.createdAt.toLocaleDateString(locale === 'pt' ? 'pt-BR' : 'en-US', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              )}
                            </div>
                          }
                        >
                          <ConfirmActionSlot>
                            {confirming ?
                              <ConfirmRow
                                key='confirm'
                                label={t(locale, 'settings.confirmDeletePasskey')}
                                busy={busy}
                                cancelLabel={t(locale, 'settings.cancel')}
                                confirmLabel={t(locale, 'settings.confirm')}
                                onCancel={() => setConfirmingId(null)}
                                onConfirm={() => handleDelete(pk.id)}
                              />
                            : <ConfirmTriggerRow
                                key='delete'
                                label={t(locale, 'settings.deletePasskey')}
                                icon={<IconX size={14} />}
                                onClick={() => setConfirmingId(pk.id)}
                              />
                            }
                          </ConfirmActionSlot>
                        </ExpandableItem>
                      </AnimatedListItem>
                    )
                  })
                }
              </AnimatedList>

              <AnimatedLayoutBlock className='flex flex-col gap-2 px-6 pt-4'>
                {passkeys !== null ?
                  passkeys.length === 0 ?
                    <Button
                      variant='row-accent'
                      size='md'
                      fullWidth
                      onClick={handleAdd}
                      status={adding ? 'pending' : 'idle'}
                      pendingLabel={t(locale, 'settings.addingPasskey')}
                      trailing={!adding && <span className='text-base leading-none'>+</span>}
                    >
                      {t(locale, 'settings.addFirstPasskey')}
                    </Button>
                  : <Button
                      variant='primary'
                      size='md'
                      fullWidth
                      onClick={handleAdd}
                      status={adding ? 'pending' : 'idle'}
                      pendingLabel={t(locale, 'settings.addingPasskey')}
                    >
                      {t(locale, 'settings.addPasskey')}
                    </Button>

                : null}
                <Button
                  variant='secondary'
                  size='md'
                  fullWidth
                  onClick={onClose}
                >
                  {t(locale, 'settings.done')}
                </Button>
                {error && <p className='text-clay text-xs'>{error}</p>}
              </AnimatedLayoutBlock>
            </AnimatedListGroup>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
