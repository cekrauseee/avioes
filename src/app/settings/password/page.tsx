import { PasswordScreen } from '@/components/password-screen'
import { requireOnboardedUser } from '@/lib/auth-guards'
import { Suspense } from 'react'
import Loading from './loading'

export default async function PasswordPage() {
  await requireOnboardedUser('/settings/password')
  return (
    <Suspense fallback={<Loading />}>
      <PasswordScreen />
    </Suspense>
  )
}
