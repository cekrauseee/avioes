import { DiaryView } from '@/components/diary-view'
import { requireActiveGroup } from '@airplanes/auth/guards'
import { readLocale } from '@airplanes/auth/cookies'
import { t } from '@airplanes/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'diary.title') }
}

export default async function DiaryPage() {
  await requireActiveGroup('/diary')
  return <DiaryView />
}
