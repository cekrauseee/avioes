import { DiaryView } from '../../components/diary-view'
import { requireOnboardedUser } from '../../lib/auth-guards'
import { readLocale } from '../../lib/cookies'
import { t } from '../../lib/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'diary.title') }
}

export default async function DiaryPage() {
  await requireOnboardedUser('/diary')
  return <DiaryView />
}
