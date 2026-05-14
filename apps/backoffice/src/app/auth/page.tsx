import { getCurrentUser } from '@airplanes/auth/guards'
import { redirect } from 'next/navigation'
import { AuthForm } from './auth-form'

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const user = await getCurrentUser()
  if (user) {
    const flags = (user as typeof user & { featureFlags?: string[] }).featureFlags ?? []
    if (flags.includes('backoffice')) redirect('/')
  }

  const params = await searchParams
  const error = params.error

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <div className="w-full max-w-sm rounded-xl border border-line bg-paper p-8">
        <h1 className="mb-1 text-xl font-semibold">Aviões Backoffice</h1>
        <p className="mb-6 text-sm text-ink-faint">Entre com sua conta para continuar.</p>
        {error === 'no_access' && <div className="mb-4 rounded-lg bg-clay-soft p-3 text-sm text-clay">Você não tem acesso ao backoffice.</div>}
        <AuthForm />
      </div>
    </div>
  )
}
