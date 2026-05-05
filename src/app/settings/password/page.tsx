import { PasswordScreen } from '@/components/password-screen'
import { requireUser } from '@/lib/auth-guards'
import { Suspense } from 'react'

export default async function PasswordPage() {
  await requireUser('/settings/password')
  return (
    <Suspense>
      <PasswordScreen />
    </Suspense>
  )
}
