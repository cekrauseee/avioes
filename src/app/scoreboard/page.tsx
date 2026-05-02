import { redirect } from 'next/navigation'
import { AppShell } from '../../components/app-shell'
import { ScoreboardView } from '../../components/scoreboard-view'
import { readIdentity } from '../../lib/cookies'
import { readEvents, readTheme } from '../../lib/store'

export default async function PlacarPage() {
  const who = await readIdentity()
  if (!who) redirect('/')

  const [events, theme] = await Promise.all([readEvents(), readTheme(who)])

  return (
    <AppShell>
      <ScoreboardView
        events={events}
        theme={theme}
      />
    </AppShell>
  )
}
