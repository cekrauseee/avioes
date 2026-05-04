import { EditGroupScreen } from '@/components/edit-group-screen'
import { requireUser } from '@/lib/auth-guards'

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireUser(`/groups/${id}/edit`)
  return <EditGroupScreen groupId={id} />
}
