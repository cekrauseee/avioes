import { readLocale } from '../lib/cookies'
import { t } from '../lib/i18n'
import { Counter } from '../components/counter'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: `${t(locale, 'nav.count')} \\ Airplanes` }
}

export default function Page() {
  return <Counter />
}
