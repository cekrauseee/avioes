'use client'

import Image from 'next/image'
import { startTransition } from 'react'
import { Button, ButtonLink } from '../components/button'
import { IconRefresh } from '../components/icons'
import { t } from '@airplanes/i18n'
import { selectLocale, useOfflineState } from '../lib/offline-store'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const state = useOfflineState()
  const locale = selectLocale(state)
  const retry = () => startTransition(() => reset())

  return (
    <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
      <header className='flex items-baseline justify-between'>
        <span className='text-ink-faint text-xs'>{t(locale, 'error.header')}</span>
        <span className='text-ink-faint text-xs'>{t(locale, 'error.headerRight')}</span>
      </header>

      <div className='flex flex-1 flex-col items-center justify-center text-center'>
        <div className='relative w-[60%] max-w-55'>
          <Image
            src='/airplane-error-light.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            unoptimized
            className='theme-light-only h-auto w-full select-none'
            draggable={false}
          />
          <Image
            src='/airplane-error-dark.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            unoptimized
            className='theme-dark-only h-auto w-full select-none'
            draggable={false}
          />
        </div>
        <h1 className='font-display mt-8 text-[34px] leading-[0.95] tracking-tight'>
          {t(locale, 'error.titleLine1')}
          <br />
          <span className='text-clay italic'>{t(locale, 'error.titleItalic')}</span>.
        </h1>
        <p className='font-display text-ink-soft mt-3 max-w-[28ch] text-sm italic'>{t(locale, 'error.body')}</p>
      </div>

      <div className='mt-4 flex flex-col items-center gap-2'>
        <Button
          variant='secondary'
          size='md'
          fullWidth
          onClick={retry}
          leading={<IconRefresh size={16} />}
        >
          {t(locale, 'error.retry')}
        </Button>
        <ButtonLink
          variant='ghost'
          size='md'
          fullWidth
          href='/'
        >
          {t(locale, 'error.home')}
        </ButtonLink>
      </div>
    </main>
  )
}
