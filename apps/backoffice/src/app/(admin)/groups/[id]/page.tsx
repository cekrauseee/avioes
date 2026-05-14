import { notFound } from 'next/navigation'
import { getGroup } from '../../../../actions/admin'
import { GroupDetail } from './group-detail'

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const group = await getGroup(id)
  if (!group) notFound()
  return <GroupDetail group={group} />
}
