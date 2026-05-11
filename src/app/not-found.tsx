'use client'

import Image from 'next/image'
import Link from 'next/link'
import { t } from '../lib/i18n'
import { selectLocale, useOfflineState } from '../lib/offline-store'

export default function NotFound() {
  const state = useOfflineState()
  const locale = selectLocale(state)

  return (
    <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
      <header className='flex items-baseline justify-between'>
        <span className='text-ink-faint text-xs'>{t(locale, 'notFound.header')}</span>
        <span className='text-ink-faint text-xs'>{t(locale, 'notFound.headerRight')}</span>
      </header>

      <div className='flex flex-1 flex-col items-center justify-center text-center'>
        <div className='relative w-[60%] max-w-55'>
          <Image
            src='/airplane-not-found-light.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            className='theme-light-only h-auto w-full select-none'
            draggable={false}
          />
          <Image
            src='/airplane-not-found-dark.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            className='theme-dark-only h-auto w-full select-none'
            draggable={false}
          />
        </div>
        <h1 className='font-display mt-8 text-[34px] leading-[0.95] tracking-tight'>
          {t(locale, 'notFound.titleLine1')} <span className='text-clay italic'>{t(locale, 'notFound.titleItalic')}</span>
          <br />
          {t(locale, 'notFound.titleLine2')}
        </h1>
        <p className='font-display text-ink-soft mt-3 max-w-[26ch] text-sm italic'>{t(locale, 'notFound.body')}</p>
      </div>

      <Link
        href='/'
        className='bg-paper text-ink hover:bg-line/40 focus-visible:bg-line/40 mt-4 inline-flex items-center justify-center gap-2 self-center rounded-full px-5 py-3 text-sm transition-colors active:scale-[0.99]'
      >
        <span
          aria-hidden
          className='text-base leading-none'
        >
          ←
        </span>
        <span className='font-display'>{t(locale, 'notFound.back')}</span>
      </Link>
    </main>
  )
}
