'use client'

import { t } from '../lib/i18n'
import { selectLocale, useOfflineState } from '../lib/offline-store'

export function StorageGate() {
  const state = useOfflineState()
  const locale = selectLocale(state)

  return (
    <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
      <header className='flex items-baseline justify-between'>
        <span className='text-ink-faint text-xs'>{t(locale, 'storage.header')}</span>
        <span className='text-ink-faint text-xs'>{t(locale, 'storage.headerRight')}</span>
      </header>

      <div className='flex flex-1 flex-col items-center justify-center text-center'>
        <span
          aria-hidden
          className='font-display text-ink-faint inline-block rotate-[10deg] text-7xl leading-none'
        >
          ✈
        </span>
        <h1 className='font-display mt-8 text-[34px] leading-[0.95] tracking-tight'>
          {t(locale, 'storage.titleLine1')}
          <br />
          <span className='text-clay italic'>{t(locale, 'storage.titleItalic')}</span>.
        </h1>
        <p className='font-display text-ink-soft mt-3 max-w-[28ch] text-sm italic'>
          {t(locale, 'storage.body')}
        </p>
      </div>
    </main>
  )
}
