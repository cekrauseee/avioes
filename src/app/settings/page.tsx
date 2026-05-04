import { readLocale } from '../../lib/cookies'
import { t } from '../../lib/i18n'
import { SettingsView } from '../../components/settings-view'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'settings.title') }
}

export default function SettingsPage() {
  return <SettingsView />
}
