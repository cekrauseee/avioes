import { PasswordChangeVerifyScreen } from '@/components/password-change-verify-screen'
import { requireUser } from '@/lib/auth-guards'
import { validatePasswordToken } from '@/lib/store'

export default async function PasswordVerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  await requireUser(`/settings/password/verify/${token}`)
  const result = await validatePasswordToken(token, 'change')

  return (
    <PasswordChangeVerifyScreen
      token={token}
      valid={!!result}
    />
  )
}
