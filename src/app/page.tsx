import { AppShell } from '../components/app-shell'
import { Counter } from '../components/counter'
import { Onboarding } from '../components/onboarding'
import { readIdentity } from '../lib/cookies'
import { counts, readTheme } from '../lib/store'

export default async function Page() {
  const who = await readIdentity()
  if (!who) return <Onboarding />

  const [t, theme] = await Promise.all([counts(), readTheme(who)])
  const partner = who === 'henrique' ? 'pietra' : 'henrique'
  const total = t.henrique + t.pietra

  return (
    <AppShell>
      <Counter
        who={who}
        myCount={t[who]}
        partnerCount={t[partner]}
        total={total}
        canUndo={t[who] > 0}
        theme={theme}
      />
    </AppShell>
  )
}
