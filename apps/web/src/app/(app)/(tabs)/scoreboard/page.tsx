import { getWorldRanking } from '@/actions'
import { ScoreboardView } from '@/components/scoreboard-view'
import { requireActiveGroup } from '@airplanes/auth/guards'
import { readLocale } from '@airplanes/auth/cookies'
import { t } from '@airplanes/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'scoreboard.title') }
}

export default async function ScoreboardPage() {
  await requireActiveGroup('/scoreboard')
  const initialRanking = await getWorldRanking({ window: 'all' })
  return <ScoreboardView initialRanking={initialRanking} />
}
