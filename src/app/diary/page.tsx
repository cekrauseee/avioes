import { readLocale } from '../../lib/cookies'
import { requireActiveGroup } from '../../lib/auth-guards'
import { t } from '../../lib/i18n'
import { DiaryView } from '../../components/diary-view'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'diary.title') }
}

export default async function DiaryPage() {
  await requireActiveGroup('/diary')
  return <DiaryView />
}
