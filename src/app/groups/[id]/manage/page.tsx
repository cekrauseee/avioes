import { ManageGroupScreen } from '@/components/manage-group-screen'
import { requireGroupOwner } from '@/lib/auth-guards'

export default async function ManageGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireGroupOwner(id, `/groups/${id}/manage`)
  return <ManageGroupScreen groupId={id} />
}
