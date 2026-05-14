import { Counter } from '@/components/counter'
import { readLocale } from '@airplanes/auth/cookies'
import { requireActiveGroup } from '@airplanes/auth/guards'
import { t } from '@airplanes/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: `${t(locale, 'nav.count')}` }
}

export default async function Page() {
  await requireActiveGroup('/')
  return <Counter />
}
