import { Suspense } from 'react'
import { readLocale } from '../../lib/cookies'
import { requireActiveGroup } from '../../lib/auth-guards'
import { t } from '../../lib/i18n'
import { SettingsView } from '../../components/settings-view'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'settings.title') }
}

export default async function SettingsPage() {
  await requireActiveGroup('/settings')
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  )
}
