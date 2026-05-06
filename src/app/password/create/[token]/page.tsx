import { PasswordCreateScreen } from '@/components/password-create-screen'
import { validatePasswordToken } from '@/lib/store'

export default async function PasswordCreatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await validatePasswordToken(token, 'create')

  return (
    <PasswordCreateScreen
      token={token}
      valid={!!result}
    />
  )
}
