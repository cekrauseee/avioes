import { AuthScreen } from '@/components/auth-screen'
import { redirectAuthenticatedUser, safeNextPath } from '@/lib/auth-guards'

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams
  await redirectAuthenticatedUser(next)
  return <AuthScreen nextPath={safeNextPath(next)} />
}
