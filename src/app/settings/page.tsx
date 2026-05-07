import { Suspense } from 'react'
import { SettingsView } from '../../components/settings-view'
import { requireOnboardedUser } from '../../lib/auth-guards'
import { readLocale } from '../../lib/cookies'
import { t } from '../../lib/i18n'
import Loading from './loading'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'settings.title') }
}

export default async function SettingsPage() {
  await requireOnboardedUser('/settings')
  return (
    <Suspense fallback={<Loading />}>
      <SettingsView />
    </Suspense>
  )
}
