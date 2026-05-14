import { NewGroupScreen } from '@/components/new-group-screen'
import { readLocale } from '@airplanes/auth/cookies'
import { requireOnboardedUser } from '@airplanes/auth/guards'
import { t } from '@airplanes/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'groups.new.title') }
}

export default async function NewGroupPage() {
  await requireOnboardedUser('/groups/new')
  return <NewGroupScreen />
}
