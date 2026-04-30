import { Skel } from '../components/skeleton'

export default function Loading() {
  return (
    <div className='flex-1 overflow-hidden'>
      <main className='relative flex h-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
        <header className='flex items-center justify-between'>
          <Skel className='h-4 w-24' />
          <Skel className='h-10 w-10 rounded-full' />
        </header>

        <div className='mt-4 flex flex-1 flex-col items-end justify-center gap-2 text-right'>
          <Skel className='h-3 w-32' />
          <Skel className='h-[clamp(96px,32vw,150px)] w-44' />
          <Skel className='h-4 w-28' />
        </div>

        <footer className='mt-4 flex items-center justify-between gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Skel className='h-3 w-16' />
            <Skel className='h-6 w-10' />
          </div>
          <Skel className='h-11 w-24 rounded-full' />
        </footer>
      </main>
    </div>
  )
}
