import { AuthScreen } from '@/components/auth-screen'
import { readLocale } from '@airplanes/auth/cookies'
import { redirectAuthenticatedUser, safeNextPath } from '@airplanes/auth/guards'
import { t } from '@airplanes/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'auth.metaTitle') }
}

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> }) {
  const { next, error } = await searchParams
  await redirectAuthenticatedUser(next)
  const oauthError =
    typeof error === 'string' ? error
    : Array.isArray(error) ? (error[0] ?? null)
    : null
  return (
    <AuthScreen
      nextPath={safeNextPath(next)}
      oauthError={oauthError}
    />
  )
}
