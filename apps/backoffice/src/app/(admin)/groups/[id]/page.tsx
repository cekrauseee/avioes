import { detectLocaleFromHeader } from '@airplanes/i18n'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getGroup } from '../../../../actions/admin'
import { GroupDetail } from './group-detail'

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, h] = await Promise.all([params, headers()])
  const locale = detectLocaleFromHeader(h.get('accept-language'))
  const group = await getGroup(id)
  if (!group) notFound()
  return (
    <GroupDetail
      group={group}
      locale={locale}
    />
  )
}
