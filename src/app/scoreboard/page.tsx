import { readLocale } from '../../lib/cookies'
import { requireActiveGroup } from '../../lib/auth-guards'
import { t } from '../../lib/i18n'
import { ScoreboardView } from '../../components/scoreboard-view'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'scoreboard.title') }
}

export default async function ScoreboardPage() {
  await requireActiveGroup('/scoreboard')
  return <ScoreboardView />
}
