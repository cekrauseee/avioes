'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { t } from '../lib/i18n'
import { selectLocale, useOfflineState } from '../lib/offline-store'

export function WorldFab() {
  const pathname = usePathname()
  const state = useOfflineState()
  const locale = selectLocale(state)
  const active = pathname === '/world'
  return (
    <Link
      href='/world'
      aria-label={t(locale, 'nav.world')}
      aria-current={active ? 'page' : undefined}
      className={`bg-sage text-paper focus-visible:ring-ink absolute top-0 left-1/2 z-20 flex h-12 w-12 -translate-x-1/2 -translate-y-[35%] items-center justify-center rounded-full shadow-md transition-transform focus-visible:ring-2 ${active ? 'ring-ink scale-105 ring-2' : 'hover:scale-105'}`}
    >
      <svg
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={1.6}
        strokeLinecap='round'
        strokeLinejoin='round'
        className='h-6 w-6'
        aria-hidden
      >
        <path d='M21.5 2.5 2.5 11.3 9 13l2 7 3-4.5 6.5-13z' />
        <path d='M9 13l5-5' />
      </svg>
    </Link>
  )
}
