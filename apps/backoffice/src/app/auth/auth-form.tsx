'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { authClient } from '../../lib/auth-client'

export function AuthForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError('')
    const result = await authClient.signIn.email({ email, password })
    if (result.error) {
      setError(result.error.message ?? 'Erro ao entrar.')
      setPending(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-4'
    >
      <div>
        <label className='text-ink-faint mb-1 block text-xs'>E-mail</label>
        <input
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete='email'
          className='border-line focus:ring-sage w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1'
        />
      </div>
      <div>
        <label className='text-ink-faint mb-1 block text-xs'>Senha</label>
        <input
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete='current-password'
          className='border-line focus:ring-sage w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1'
        />
      </div>
      {error && <p className='text-clay text-sm'>{error}</p>}
      <button
        type='submit'
        disabled={pending}
        className='bg-sage w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50'
      >
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
