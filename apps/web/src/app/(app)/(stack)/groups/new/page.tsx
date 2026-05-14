import { NewGroupScreen } from '@/components/new-group-screen'
import { requireOnboardedUser } from '@airplanes/auth/guards'
import { readLocale } from '@airplanes/auth/cookies'
import { t } from '@airplanes/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'groups.new.title') }
}

export default async function NewGroupPage() {
  await requireOnboardedUser('/groups/new')
  return <NewGroupScreen />
}
