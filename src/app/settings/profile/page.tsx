import { ProfileScreen } from '@/components/profile-screen'
import { requireOnboardedUser } from '@/lib/auth-guards'
import { Suspense } from 'react'

export default async function ProfilePage() {
  await requireOnboardedUser('/settings/profile')
  return (
    <Suspense>
      <ProfileScreen />
    </Suspense>
  )
}
