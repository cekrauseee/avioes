import { Skel } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className='flex-1 overflow-hidden'>
      <main className='relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
        <header className='relative z-10 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Skel className='h-2 w-2 rounded-full' />
            <Skel className='h-5 w-24' />
          </div>
          <div className='flex items-center gap-2'>
            <Skel className='h-3 w-20' />
            <Skel className='h-10 w-10 rounded-full' />
          </div>
        </header>

        <div className='relative z-10 mt-4 flex flex-1 flex-col items-end justify-center text-right'>
          <Skel className='h-3 w-32' />
          <Skel className='mt-4 h-28 w-36 rounded-2xl' />
          <Skel className='mt-3 h-5 w-28' />
        </div>

        <footer className='relative z-10 mt-4 flex items-end justify-between gap-4'>
          <div className='flex flex-col gap-2'>
            <Skel className='h-3 w-16' />
            <Skel className='h-6 w-8' />
          </div>
          <Skel className='h-11 w-24 rounded-full' />
        </footer>
      </main>
    </div>
  )
}
