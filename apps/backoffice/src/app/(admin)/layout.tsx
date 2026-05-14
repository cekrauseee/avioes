import { requireBackofficeUser } from '@airplanes/auth/guards'
import type { ReactNode } from 'react'
import { Sidebar } from '../../components/sidebar'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireBackofficeUser('/')
  const name = (user as typeof user & { firstName?: string | null }).firstName ?? user.name ?? user.email

  return (
    <div className="flex h-dvh">
      <Sidebar userName={name} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
