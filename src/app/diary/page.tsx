import { redirect } from 'next/navigation'
import { AppShell } from '../../components/app-shell'
import { DiaryView } from '../../components/diary-view'
import { readIdentity } from '../../lib/cookies'
import { readEvents, readTheme } from '../../lib/store'

export default async function DiarioPage() {
  const who = await readIdentity()
  if (!who) redirect('/')

  const [events, theme] = await Promise.all([readEvents(), readTheme(who)])

  return (
    <AppShell>
      <DiaryView
        events={events}
        theme={theme}
      />
    </AppShell>
  )
}
