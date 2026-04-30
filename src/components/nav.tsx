'use client'

import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { startTransition, useOptimistic } from 'react'
import { IDENTITIES, type Identity } from '../lib/types'

const links = [
  { href: '/', label: 'Contar' },
  { href: '/diary', label: 'Diário' },
  { href: '/scoreboard', label: 'Placar' }
]

export function Nav({ who }: { who: Identity }) {
  const pathname = usePathname()
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const accent = IDENTITIES[who]

  const [activeHref, setActiveHref] = useOptimistic(pathname, (_state, next: string) => next)

  const onTap = (href: string) => (e: React.MouseEvent) => {
    if (href === activeHref) return
    e.preventDefault()
    startTransition(() => {
      setActiveHref(href)
      router.push(href)
    })
  }

  return (
    <nav className='flex items-stretch'>
      {links.map((l) => {
        const active = activeHref === l.href
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onTap(l.href)}
            aria-current={active ? 'page' : undefined}
            className='group relative flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1.5 py-2 select-none'
          >
            <span
              className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                active ?
                  accent.bg
                : 'bg-ink-faint/30 group-hover:bg-ink-faint/70 group-focus-visible:bg-ink-faint/70 group-hover:scale-125 group-focus-visible:scale-125'
              }`}
              aria-hidden
            />
            <span
              className={`font-display text-base leading-none transition-colors ${
                active ? 'text-ink' : 'text-ink-soft group-hover:text-ink group-focus-visible:text-ink'
              }`}
            >
              {l.label}
            </span>
            {active && (
              <motion.span
                layoutId='nav-active'
                aria-hidden
                className={`absolute bottom-1.5 h-[2px] w-8 rounded-full ${accent.bg}`}
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
