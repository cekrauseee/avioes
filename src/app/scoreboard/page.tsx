import { readLocale } from '../../lib/cookies'
import { t } from '../../lib/i18n'
import { ScoreboardView } from '../../components/scoreboard-view'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'scoreboard.title') }
}

export default function ScoreboardPage() {
  return <ScoreboardView />
}
