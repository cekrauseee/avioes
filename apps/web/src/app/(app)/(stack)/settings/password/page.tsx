import { PasswordScreen } from '@/components/password-screen'
import { requireOnboardedUser } from '@airplanes/auth/guards'
import { readLocale } from '@airplanes/auth/cookies'
import { t } from '@airplanes/i18n'
import { Suspense } from 'react'
import Loading from './loading'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'settings.changePassword') }
}

export default async function PasswordPage() {
  await requireOnboardedUser('/settings/password')
  return (
    <Suspense fallback={<Loading />}>
      <PasswordScreen />
    </Suspense>
  )
}
