import { Skel } from '../../components/skeleton'

export default function Loading() {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <header className='px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-2'>
        <div className='flex items-center justify-between'>
          <Skel className='h-8 w-28' />
          <Skel className='h-10 w-10 rounded-full' />
        </div>
        <Skel className='mt-2 h-3.5 w-44' />

        <div className='-mx-5 mt-3 flex items-stretch'>
          <div className='flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1.5 py-2'>
            <Skel className='h-1.5 w-1.5 rounded-full' />
            <Skel className='h-4 w-12' />
          </div>
          <div className='flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1.5 py-2'>
            <Skel className='h-1.5 w-1.5 rounded-full' />
            <Skel className='h-4 w-16' />
          </div>
        </div>
      </header>

      <div className='flex min-h-0 flex-1 flex-col px-5 py-3'>
        <Skel className='min-h-0 flex-1 rounded-xl' />
      </div>
    </div>
  )
}
