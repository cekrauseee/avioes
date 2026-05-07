import { getWorldRanking } from '../../actions'
import { WorldView } from '../../components/world-view'
import { requireUser } from '../../lib/auth-guards'
import { readLocale } from '../../lib/cookies'
import { t } from '../../lib/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'world.title') }
}

export default async function WorldPage() {
  await requireUser('/world')
  const initial = await getWorldRanking({ window: 'all' })
  return <WorldView initial={initial} />
}
