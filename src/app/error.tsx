'use client'

import Image from 'next/image'
import Link from 'next/link'
import { startTransition } from 'react'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const retry = () => startTransition(() => reset())

  return (
    <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
      <header className='flex items-baseline justify-between'>
        <span className='text-ink-faint text-xs'>aviões · 500</span>
        <span className='text-ink-faint text-xs'>turbulência</span>
      </header>

      <div className='flex flex-1 flex-col items-center justify-center text-center'>
        <div className='relative w-[60%] max-w-55'>
          <Image
            src='/airplane-error-light.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            unoptimized
            className='theme-light-only h-auto w-full select-none'
            draggable={false}
          />
          <Image
            src='/airplane-error-dark.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            unoptimized
            className='theme-dark-only h-auto w-full select-none'
            draggable={false}
          />
        </div>
        <h1 className='font-display mt-8 text-[34px] leading-[0.95] tracking-tight'>
          Um pouco de
          <br />
          <span className='text-clay italic'>turbulência</span>.
        </h1>
        <p className='font-display text-ink-soft mt-3 max-w-[28ch] text-sm italic'>Algo saiu do prumo aqui. Tenta de novo daqui a pouco.</p>
      </div>

      <div className='mt-4 flex flex-col items-center gap-1.5'>
        <button
          type='button'
          onClick={retry}
          className='bg-paper text-ink hover:bg-line/40 focus-visible:bg-line/40 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm transition-colors active:scale-[0.99]'
        >
          <span
            aria-hidden
            className='text-base leading-none'
          >
            ↻
          </span>
          <span className='font-display'>tentar de novo</span>
        </button>
        <Link
          href='/'
          className='text-ink-faint hover:text-ink-soft focus-visible:text-ink-soft inline-flex items-center gap-1 px-3 py-1.5 text-xs transition-colors'
        >
          <span aria-hidden>←</span>
          <span>voltar pra contagem</span>
        </Link>
      </div>
    </main>
  )
}
