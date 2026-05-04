import Image from 'next/image'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
      <header className='flex items-baseline justify-between'>
        <span className='text-ink-faint text-xs'>aviões · 404</span>
        <span className='text-ink-faint text-xs'>fora de rota</span>
      </header>

      <div className='flex flex-1 flex-col items-center justify-center text-center'>
        <div className='relative w-[60%] max-w-55'>
          <Image
            src='/airplane-not-found-light.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            unoptimized
            className='theme-light-only h-auto w-full select-none'
            draggable={false}
          />
          <Image
            src='/airplane-not-found-dark.png'
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
          Céu <span className='text-clay italic'>vazio</span>
          <br />
          por aqui.
        </h1>
        <p className='font-display text-ink-soft mt-3 max-w-[26ch] text-sm italic'>Essa página perdeu a rota — ou nunca decolou.</p>
      </div>

      <Link
        href='/'
        className='bg-paper text-ink hover:bg-line/40 focus-visible:bg-line/40 mt-4 inline-flex items-center justify-center gap-2 self-center rounded-full px-5 py-3 text-sm transition-colors active:scale-[0.99]'
      >
        <span
          aria-hidden
          className='text-base leading-none'
        >
          ←
        </span>
        <span className='font-display'>voltar pra contagem</span>
      </Link>
    </main>
  )
}
