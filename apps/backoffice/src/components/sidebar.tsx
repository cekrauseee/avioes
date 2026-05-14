'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Início' },
  { href: '/users', label: 'Usuários' },
  { href: '/groups', label: 'Grupos' }
] as const

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-56 flex-col border-r border-line bg-paper">
      <div className="border-b border-line px-5 py-4">
        <Link href="/" className="text-lg font-semibold text-ink no-underline hover:no-underline">
          Aviões
        </Link>
        <p className="mt-0.5 text-xs text-ink-faint">backoffice</p>
      </div>
      <nav className="flex-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 block rounded-lg px-3 py-2 text-sm no-underline transition-colors hover:no-underline ${
                active ? 'bg-sage-soft font-medium text-ink' : 'text-ink-soft hover:bg-bg-soft'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-line px-5 py-3">
        <p className="truncate text-xs text-ink-faint">{userName}</p>
      </div>
    </aside>
  )
}
