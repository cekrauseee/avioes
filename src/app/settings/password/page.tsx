import { Suspense } from 'react'
import { PasswordScreen } from '@/components/password-screen'
import { requireUser } from '@/lib/auth-guards'

export default async function PasswordPage() {
  await requireUser('/settings/password')
  return (
    <Suspense>
      <PasswordScreen />
    </Suspense>
  )
}
