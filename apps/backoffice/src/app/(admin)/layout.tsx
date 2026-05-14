import { requireBackofficeUser } from '@airplanes/auth/guards'
import { detectLocaleFromHeader } from '@airplanes/i18n'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'
import { Sidebar } from '../../components/sidebar'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireBackofficeUser('/')
  const h = await headers()
  const locale = detectLocaleFromHeader(h.get('accept-language'))
  const name = (user as typeof user & { firstName?: string | null }).firstName ?? user.name ?? user.email

  return (
    <div className='flex h-dvh'>
      <Sidebar
        userName={name}
        locale={locale}
      />
      <main className='flex-1 overflow-y-auto p-6'>{children}</main>
    </div>
  )
}
