import { NewGroupScreen } from '@/components/new-group-screen'
import { requireUser } from '@/lib/auth-guards'

export default async function NewGroupPage() {
  await requireUser('/groups/new')
  return <NewGroupScreen />
}
