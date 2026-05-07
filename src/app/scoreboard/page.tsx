import { ScoreboardView } from '../../components/scoreboard-view'
import { requireOnboardedUser } from '../../lib/auth-guards'
import { readLocale } from '../../lib/cookies'
import { t } from '../../lib/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'scoreboard.title') }
}

export default async function ScoreboardPage() {
  await requireOnboardedUser('/scoreboard')
  return <ScoreboardView />
}
