import { EditGroupScreen } from '@/components/edit-group-screen'
import { requireGroupMember } from '@/lib/auth-guards'

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireGroupMember(id, `/groups/${id}/edit`)
  return <EditGroupScreen groupId={id} />
}
