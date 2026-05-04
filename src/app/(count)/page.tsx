import { Counter } from '../../components/counter'
import { requireActiveGroup } from '../../lib/auth-guards'
import { readLocale } from '../../lib/cookies'
import { t } from '../../lib/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: `${t(locale, 'nav.count')} \\ Airplanes` }
}

export default async function Page() {
  await requireActiveGroup('/')
  return <Counter />
}
