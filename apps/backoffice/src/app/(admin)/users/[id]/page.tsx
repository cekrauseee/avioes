import { notFound } from 'next/navigation'
import { getUser } from '../../../../actions/admin'
import { UserDetail } from './user-detail'

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(id)
  if (!user) notFound()
  return <UserDetail user={user} />
}
