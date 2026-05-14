'use client'

import { t, type TKey } from '@airplanes/i18n'
import type { Locale } from '@airplanes/types'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS: { href: string; key: TKey }[] = [
  { href: '/', key: 'admin.nav.home' },
  { href: '/users', key: 'admin.nav.users' },
  { href: '/groups', key: 'admin.nav.groups' }
]

export function Sidebar({ userName, locale }: { userName: string; locale: Locale }) {
  const pathname = usePathname()

  return (
    <aside className='border-line bg-paper flex h-full w-56 flex-col border-r'>
      <div className='border-line border-b px-5 py-4'>
        <Link
          href='/'
          className='text-ink text-lg font-semibold no-underline hover:no-underline'
        >
          Aviões
        </Link>
        <p className='text-ink-faint mt-0.5 text-xs'>backoffice</p>
      </div>
      <nav className='flex-1 px-3 py-4'>
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 block rounded-lg px-3 py-2 text-sm no-underline transition-colors hover:no-underline ${
                active ? 'bg-sage-soft text-ink font-medium' : 'text-ink-soft hover:bg-bg-soft'
              }`}
            >
              {t(locale, item.key)}
            </Link>
          )
        })}
      </nav>
      <div className='border-line border-t px-5 py-3'>
        <p className='text-ink-faint truncate text-xs'>{userName}</p>
      </div>
    </aside>
  )
}
