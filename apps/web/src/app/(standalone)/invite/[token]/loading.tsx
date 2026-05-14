import { Skel } from '@/components/skeleton'

export default function Loading() {
  return (
    <main className='flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
      <header>
        <Skel className='h-3 w-16' />
      </header>

      <div className='mt-12 flex flex-col'>
        <Skel className='h-10 w-44' />
        <Skel className='mt-2 h-10 w-32' />

        <div className='mt-6 flex items-center gap-3'>
          <Skel className='h-10 w-10 rounded-full' />
          <div className='flex flex-col gap-1.5'>
            <Skel className='h-4 w-36' />
            <Skel className='h-3 w-24' />
          </div>
        </div>

        <div className='mx-auto my-auto'>
          <Skel className='h-44 w-44 rounded-2xl opacity-30' />
        </div>

        <div className='flex flex-col gap-3'>
          <Skel className='h-12 w-full rounded-xl' />
          <Skel className='h-12 w-full rounded-xl' />
        </div>
      </div>
    </main>
  )
}
