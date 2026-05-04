'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { getGroupDetails, updateGroup } from '../actions'

export function EditGroupScreen({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    getGroupDetails(groupId).then((data) => {
      if (data) {
        setName(data.name)
        setOriginalName(data.name)
        setIsOwner(data.isOwner)
      }
      setLoaded(true)
    })
  }, [groupId])

  const trimmed = name.trim()
  const dirty = trimmed !== originalName && trimmed.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dirty) return
    setError(null)
    start(async () => {
      try {
        const result = await updateGroup(groupId, { name: trimmed })
        if ('error' in result) {
          setError(result.error)
          return
        }
        setOriginalName(trimmed)
        router.back()
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
            ajustar
            <br />
            <span className='text-sage italic'>grupo</span>
          </h1>
        </motion.div>

        {loaded && !isOwner ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className='text-ink-faint mt-10 text-sm'
          >
            apenas o dono do grupo pode editar.
          </motion.p>
        ) : (
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
                onChange={(e) => { setName(e.target.value); setError(null) }}
                placeholder='ex: família, amigos da escola…'
                disabled={!loaded}
                maxLength={60}
                className='border-line bg-paper text-ink placeholder:text-ink-faint w-full rounded-xl border px-4 py-3 text-sm outline-none ring-sage/40 transition-all focus:ring-2 disabled:opacity-50'
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
              disabled={pending || !dirty || !loaded}
              className='bg-sage text-bg mt-2 flex h-12 items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50'
            >
              {pending ?
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  salvando…
                </motion.span>
              : 'salvar →'
              }
            </button>
          </motion.form>
        )}
    </div>
  )
}
