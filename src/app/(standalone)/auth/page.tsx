import { AuthScreen } from '@/components/auth-screen'
import { redirectAuthenticatedUser, safeNextPath } from '@/lib/auth-guards'

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
