'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'

export function OfflineGate() {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)

  const retry = () => {
    setRetrying(true)
    startTransition(() => {
      router.refresh()
      window.setTimeout(() => setRetrying(false), 600)
    })
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'
    >
      <header className='flex items-baseline justify-between'>
        <span className='text-ink-faint text-xs'>aviões · sem sinal</span>
        <span className='text-ink-faint text-xs'>pouso adiado</span>
      </header>

      <div className='flex flex-1 flex-col items-center justify-center text-center'>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className='relative w-[64%] max-w-[240px]'
        >
          <Image
            src='/airplane-offline-light.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            priority
            unoptimized
            className='theme-light-only h-auto w-full select-none'
            draggable={false}
          />
          <Image
            src='/airplane-offline-dark.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            priority
            unoptimized
            className='theme-dark-only h-auto w-full select-none'
            draggable={false}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className='font-display mt-8 text-[34px] leading-[0.95] tracking-tight'
        >
          Sem rede,
          <br />
          <span className='text-clay italic'>sem rumo</span>.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className='font-display text-ink-soft mt-3 max-w-[28ch] text-sm italic'
        >
          A gente precisa saber quem está olhando o céu antes de contar offline. Volta quando o avião pousar — basta um instante de internet.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className='mt-4 flex flex-col items-center gap-1.5'
      >
        <button
          type='button'
          onClick={retry}
          disabled={retrying}
          className='bg-paper text-ink hover:bg-line/40 focus-visible:bg-line/40 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm transition-colors active:scale-[0.99] disabled:opacity-50'
        >
          <motion.span
            aria-hidden
            className='text-base leading-none'
            animate={retrying ? { rotate: 360 } : { rotate: 0 }}
            transition={retrying ? { duration: 0.8, ease: 'linear', repeat: Infinity } : { duration: 0.2 }}
          >
            ↻
          </motion.span>
          <span className='font-display'>tentar de novo</span>
        </button>
        <p className='text-ink-faint mt-1 max-w-[28ch] text-center text-[11px]'>identidade fica salva neste dispositivo · sem login</p>
      </motion.div>
    </motion.main>
  )
}
