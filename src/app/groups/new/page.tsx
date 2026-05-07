import { NewGroupScreen } from '@/components/new-group-screen'
import { requireOnboardedUser } from '@/lib/auth-guards'

export default async function NewGroupPage() {
  await requireOnboardedUser('/groups/new')
  return <NewGroupScreen />
}
