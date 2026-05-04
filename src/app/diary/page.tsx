import { readLocale } from '../../lib/cookies'
import { t } from '../../lib/i18n'
import { DiaryView } from '../../components/diary-view'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'diary.title') }
}

export default function DiaryPage() {
  return <DiaryView />
}
