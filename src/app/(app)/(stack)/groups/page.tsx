import { GroupsScreen } from '@/components/groups-screen'
import { requireOnboardedUser } from '@/lib/auth-guards'

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requireOnboardedUser('/groups')
  const { from } = await searchParams
  return <GroupsScreen from={from} />
}
