import { NewGroupScreen } from '@/components/new-group-screen'
import { requireOnboardedUser } from '@/lib/auth-guards'
import { readLocale } from '@/lib/cookies'
import { t } from '@/lib/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'groups.new.title') }
}

export default async function NewGroupPage() {
  await requireOnboardedUser('/groups/new')
  return <NewGroupScreen />
}
