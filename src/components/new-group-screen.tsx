'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createNewGroup, setActiveGroup } from '../actions'
import { applyServerSnapshot } from '../lib/offline-store'

export function NewGroupScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Insira um nome')
      return
    }
    setError(null)
    start(async () => {
      try {
        const result = await createNewGroup(name.trim())
        if ('error' in result) {
          setError(result.error)
          return
        }
        const snapshot = await setActiveGroup(result.groupId)
        if (!snapshot.activeGroupId) {
          setError('Algo deu errado. Tente de novo.')
          return
        }
        applyServerSnapshot(snapshot)
        router.replace('/')
      } catch {
        setError('Algo deu errado. Tente de novo.')
      }
    })
  }

  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>

        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className='flex items-center justify-between gap-3'
        >
          <span className='text-ink-faint font-display text-sm italic'>aviões</span>
          <button
            type='button'
            onClick={() => router.back()}
            className='border-line bg-paper text-ink-soft hover:bg-line/40 focus-visible:bg-line/40 focus-visible:ring-sage/40 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-all active:scale-[0.99] focus-visible:ring-2 focus-visible:outline-none'
          >
            <span aria-hidden>←</span>
            <span>voltar</span>
          </button>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className='mt-12'
        >
          <h1 className='font-display text-[36px] leading-[0.93] tracking-tight'>
            novo
            <br />
            <span className='text-sage italic'>grupo</span>
          </h1>
          <p className='text-ink-faint mt-3 text-sm'>você será o dono e poderá adicionar membros depois.</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          onSubmit={handleSubmit}
          className='mt-10 flex flex-col gap-4'
        >
          <div className='flex flex-col gap-1.5'>
            <label className='text-ink-faint text-xs'>nome do grupo</label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='ex: família, amigos da escola…'
              autoFocus
              maxLength={60}
              className='border-line bg-paper text-ink placeholder:text-ink-faint w-full rounded-xl border px-4 py-3 text-sm outline-none ring-sage/40 transition-all focus:ring-2'
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className='text-clay text-sm'
            >
              {error}
            </motion.p>
          )}

          <button
            type='submit'
            disabled={pending || !name.trim()}
            className='bg-sage text-bg mt-2 flex h-12 items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50'
          >
            {pending ?
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                criando…
              </motion.span>
            : 'criar grupo →'
            }
          </button>
        </motion.form>
    </div>
  )
}
