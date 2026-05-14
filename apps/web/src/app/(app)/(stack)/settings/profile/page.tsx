import { ProfileScreen } from '@/components/profile-screen'
import { readLocale } from '@airplanes/auth/cookies'
import { requireOnboardedUser } from '@airplanes/auth/guards'
import { t } from '@airplanes/i18n'
import { Suspense } from 'react'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'profile.metaTitle') }
}

export default async function ProfilePage() {
  await requireOnboardedUser('/settings/profile')
  return (
    <Suspense>
      <ProfileScreen />
    </Suspense>
  )
}
