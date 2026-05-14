import { detectLocaleFromHeader } from '@airplanes/i18n'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getUser } from '../../../../actions/admin'
import { UserDetail } from './user-detail'

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, h] = await Promise.all([params, headers()])
  const locale = detectLocaleFromHeader(h.get('accept-language'))
  const user = await getUser(id)
  if (!user) notFound()
  return (
    <UserDetail
      user={user}
      locale={locale}
    />
  )
}
