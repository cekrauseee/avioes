import { ManageGroupScreen } from '@/components/manage-group-screen'
import { requireUser } from '@/lib/auth-guards'

export default async function ManageGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireUser(`/groups/${id}/manage`)
  return <ManageGroupScreen groupId={id} />
}
