import { SettingsView } from '@/components/settings-view'
import { readLocale } from '@airplanes/auth/cookies'
import { requireActiveGroup } from '@airplanes/auth/guards'
import { t } from '@airplanes/i18n'
import { Suspense } from 'react'
import Loading from './loading'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'settings.title') }
}

export default async function SettingsPage() {
  await requireActiveGroup('/settings')
  return (
    <Suspense fallback={<Loading />}>
      <SettingsView />
    </Suspense>
  )
}
