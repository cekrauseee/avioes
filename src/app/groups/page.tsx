import { GroupsScreen } from '@/components/groups-screen'
import { requireOnboardedUser } from '@/lib/auth-guards'

export default async function GroupsPage() {
  await requireOnboardedUser('/groups')
  return <GroupsScreen />
}
