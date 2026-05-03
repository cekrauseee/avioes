'use client'

export function StorageGate() {
  return (
    <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
      <header className='flex items-baseline justify-between'>
        <span className='text-ink-faint text-xs'>aviões · armazenamento</span>
        <span className='text-ink-faint text-xs'>bloqueado</span>
      </header>

      <div className='flex flex-1 flex-col items-center justify-center text-center'>
        <span
          aria-hidden
          className='font-display text-ink-faint inline-block rotate-[10deg] text-7xl leading-none'
        >
          ✈
        </span>
        <h1 className='font-display mt-8 text-[34px] leading-[0.95] tracking-tight'>
          Sem lugar
          <br />
          <span className='text-clay italic'>pra guardar</span>.
        </h1>
        <p className='font-display text-ink-soft mt-3 max-w-[28ch] text-sm italic'>
          O modo offline precisa do armazenamento do navegador. Ative o armazenamento do site e tente de novo.
        </p>
      </div>
    </main>
  )
}
