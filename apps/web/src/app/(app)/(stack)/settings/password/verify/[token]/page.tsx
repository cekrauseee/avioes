import { PasswordChangeVerifyScreen } from '@/components/password-change-verify-screen'
import { readLocale } from '@airplanes/auth/cookies'
import { requireUser } from '@airplanes/auth/guards'
import { validatePasswordToken } from '@airplanes/db/store'
import { t } from '@airplanes/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'settings.changePassword') }
}

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
