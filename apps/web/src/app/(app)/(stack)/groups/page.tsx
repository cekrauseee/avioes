import { GroupsScreen } from '@/components/groups-screen'
import { readLocale } from '@airplanes/auth/cookies'
import { requireOnboardedUser } from '@airplanes/auth/guards'
import { t } from '@airplanes/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'groups.title') }
}

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requireOnboardedUser('/groups')
  const { from } = await searchParams
  return <GroupsScreen from={from} />
}
