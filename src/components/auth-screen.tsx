'use client'

import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { emailExists } from '../actions'
import { authClient } from '../lib/auth-client'
import { applyLocalIdentity } from '../lib/offline-store'

type Step = 'email' | 'password' | 'name'

const STEP_ORDER: Record<Step, number> = { email: 0, password: 1, name: 2 }

const emailSchema = z.email({ message: 'E-mail inválido.' })
const passwordSchema = z.string().min(8, 'Senha precisa ter pelo menos 8 caracteres.').max(128, 'Senha muito longa.')
const nameSchema = z.string().trim().min(1, 'Insira um nome.').max(60, 'Nome muito longo.')

function firstError(result: { success: true } | { success: false; error: z.ZodError }): string | null {
  return result.success ? null : (result.error.issues[0]?.message ?? 'Valor inválido')
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 24, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: -dir * 24, opacity: 0 })
}

const slideTransition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const }

export function AuthScreen({ nextPath }: { nextPath: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [direction, setDirection] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [accountExists, setAccountExists] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    applyLocalIdentity(null)
  }, [])

  const advanceTo = (next: Step) => {
    setDirection(STEP_ORDER[next] >= STEP_ORDER[step] ? 1 : -1)
    setStep(next)
  }

  const goToPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = email.trim().toLowerCase()
    const emailError = firstError(emailSchema.safeParse(normalized))
    if (emailError) {
      setError(emailError)
      return
    }
    setLoading(true)
    setError(null)
    const exists = await emailExists(normalized)
    setAccountExists(exists)
    setLoading(false)
    advanceTo('password')
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError('Insira uma senha.')
      return
    }

    if (accountExists) {
      setLoading(true)
      setError(null)
      const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password })
      setLoading(false)
      if (result.error) {
        if (result.error.status === 401 || result.error.status === 400) {
          setError('Senha incorreta.')
        } else {
          setError('Algo deu errado. Tente de novo.')
        }
        return
      }
      router.replace(nextPath)
      router.refresh()
      return
    }

    // New account → validate password before asking for name
    const passwordError = firstError(passwordSchema.safeParse(password))
    if (passwordError) {
      setError(passwordError)
      return
    }
    setError(null)
    advanceTo('name')
  }

  const handleSignUpWithName = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const nameError = firstError(nameSchema.safeParse(trimmedName))
    if (nameError) {
      setError(nameError)
      return
    }
    setLoading(true)
    setError(null)

    const result = await authClient.signUp.email({
      email: email.trim().toLowerCase(),
      password,
      name: trimmedName
    })

    if (!result.error) {
      router.replace(nextPath)
      router.refresh()
      return
    }

    setLoading(false)
    // Race: email got created between check and signup
    if (result.error.status === 422 || result.error.status === 409) {
      setAccountExists(true)
      setError('Esta conta já existe. Tente entrar.')
      setDirection(-1)
      setStep('password')
      return
    }
    setError('Algo deu errado. Tente de novo.')
  }

  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className='flex items-baseline justify-between'
      >
        <span className='text-ink-faint font-display text-sm italic'>aviões</span>
        <span className='text-ink-faint text-xs'>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date())}</span>
      </motion.header>

      {/* Main content */}
      <div className='mt-12 flex flex-1 flex-col'>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className='relative'
        >
          <AnimatePresence
            mode='wait'
            custom={direction}
            initial={false}
          >
            <motion.div
              key={`heading-${step}-${accountExists ?? 'pending'}`}
              custom={direction}
              variants={slideVariants}
              initial='enter'
              animate='center'
              exit='exit'
              transition={slideTransition}
            >
              <h1 className='font-display text-[38px] leading-[0.92] tracking-tight'>
                {step === 'name' ?
                  <>
                    escolha um
                    <br />
                    <span className='text-sage italic'>nome</span>
                  </>
                : step === 'password' && accountExists ?
                  <>
                    bem-vindo
                    <br />
                    <span className='text-sage italic'>de volta</span>
                  </>
                : step === 'password' && accountExists === false ?
                  <>
                    crie sua
                    <br />
                    <span className='text-sage italic'>conta</span>
                  </>
                : <>
                    entre ou
                    <br />
                    <span className='text-sage italic'>crie sua conta</span>
                  </>
                }
              </h1>
              <p className='text-ink-faint mt-3 truncate text-sm'>
                {step === 'email' && 'para não perder nenhum.'}
                {step === 'password' && email}
                {step === 'name' && 'como seus amigos devem te ver no grupo?'}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          onSubmit={
            step === 'email' ? goToPassword
            : step === 'name' ?
              handleSignUpWithName
            : handlePassword
          }
          className='mt-10 flex flex-col gap-4'
        >
          <AnimatePresence
            mode='wait'
            custom={direction}
            initial={false}
          >
            <motion.div
              key={`fields-${step}`}
              custom={direction}
              variants={slideVariants}
              initial='enter'
              animate='center'
              exit='exit'
              transition={slideTransition}
              className='flex flex-col gap-4'
            >
              {step === 'email' && (
                <Field
                  label='e-mail'
                  type='text'
                  value={email}
                  onChange={setEmail}
                  placeholder='você@exemplo.com'
                  autoFocus
                  autoComplete='email'
                />
              )}

              {step === 'password' && (
                <>
                  <Field
                    label={accountExists === false ? 'crie uma senha' : 'senha'}
                    type='password'
                    value={password}
                    onChange={setPassword}
                    placeholder='••••••••'
                    autoFocus
                    autoComplete={accountExists ? 'current-password' : 'new-password'}
                  />
                  <button
                    type='button'
                    onClick={() => {
                      advanceTo('email')
                      setError(null)
                      setAccountExists(null)
                      setPassword('')
                    }}
                    className='border-line bg-paper text-ink-soft hover:bg-line/40 focus-visible:bg-line/40 focus-visible:ring-sage/40 inline-flex min-h-11 items-center gap-2 self-start rounded-full border px-4 text-sm transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]'
                  >
                    <span aria-hidden>←</span>
                    <span>trocar e-mail</span>
                  </button>
                </>
              )}

              {step === 'name' && (
                <>
                  <Field
                    label='nome'
                    type='text'
                    value={name}
                    onChange={setName}
                    placeholder='como te chamam?'
                    autoFocus
                    autoComplete='name'
                  />
                  <button
                    type='button'
                    onClick={() => {
                      advanceTo('password')
                      setError(null)
                    }}
                    className='border-line bg-paper text-ink-soft hover:bg-line/40 focus-visible:bg-line/40 focus-visible:ring-sage/40 inline-flex min-h-11 items-center gap-2 self-start rounded-full border px-4 text-sm transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]'
                  >
                    <span aria-hidden>←</span>
                    <span>voltar</span>
                  </button>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence
            mode='wait'
            initial={false}
          >
            {error && (
              <motion.p
                key={error}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className='text-clay text-sm'
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type='submit'
            disabled={loading}
            className='bg-sage text-bg mt-2 flex h-12 items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50'
          >
            {loading ?
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {step === 'name' ?
                  'criando conta…'
                : step === 'password' && accountExists ?
                  'entrando…'
                : 'aguarde…'}
              </motion.span>
            : step === 'email' ?
              'continuar →'
            : step === 'name' ?
              'criar conta →'
            : accountExists ?
              'entrar →'
            : 'continuar →'}
          </button>
        </motion.form>
      </div>
    </div>
  )
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoFocus,
  autoComplete,
  ref
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  autoComplete?: string
  ref?: React.Ref<HTMLInputElement>
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-ink-faint text-xs'>{label}</label>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        className='border-line bg-paper text-ink placeholder:text-ink-faint ring-sage/40 w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none focus:ring-2'
      />
    </div>
  )
}
