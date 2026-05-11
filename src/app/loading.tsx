import Image from 'next/image'

export default function Loading() {
  return (
    <div className='flex-1 overflow-hidden'>
      <main className='relative flex h-full flex-col items-center justify-center px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
        <div className='relative w-[58%] max-w-60 animate-pulse'>
          <Image
            src='/splash-light.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            priority
            className='theme-light-only h-auto w-full select-none'
            draggable={false}
          />
          <Image
            src='/splash-dark.png'
            alt=''
            aria-hidden
            width={480}
            height={480}
            priority
            className='theme-dark-only h-auto w-full select-none'
            draggable={false}
          />
        </div>
        <p className='font-display text-ink-soft mt-6 text-sm italic'>preparando o céu…</p>
      </main>
    </div>
  )
}
