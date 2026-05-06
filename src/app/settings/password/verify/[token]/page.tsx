import { PasswordChangeVerifyScreen } from '@/components/password-change-verify-screen'
import { requireUser } from '@/lib/auth-guards'
import { validatePasswordToken } from '@/lib/store'

export default async function PasswordVerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const user = await requireUser(`/settings/password/verify/${token}`)
  const result = await validatePasswordToken(token, 'change')

  const unauthorized = result ? result.email !== user.email.toLowerCase() : false

  return (
    <PasswordChangeVerifyScreen
      token={token}
      valid={!!result && !unauthorized}
      unauthorized={unauthorized}
    />
  )
}
