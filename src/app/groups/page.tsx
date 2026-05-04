import { GroupsScreen } from '@/components/groups-screen'
import { requireUser } from '@/lib/auth-guards'

export default async function GroupsPage() {
  await requireUser('/groups')
  return <GroupsScreen />
}
