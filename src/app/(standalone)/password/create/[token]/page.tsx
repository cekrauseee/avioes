import { PasswordCreateScreen } from '@/components/password-create-screen'
import { readLocale } from '@/lib/cookies'
import { t } from '@/lib/i18n'
import { validatePasswordToken } from '@/lib/store'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'password.metaTitle') }
}

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
