import { Skel } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)]'>
      <div className='flex items-center justify-between gap-3'>
        <Skel className='h-4 w-14' />
        <Skel className='h-9 w-28 rounded-full' />
      </div>

      <div className='mt-10 flex flex-col gap-3'>
        <Skel className='h-9 w-32' />
        <Skel className='h-9 w-24' />
        <Skel className='mt-1 h-4 w-48' />
      </div>

      <div className='mt-8 flex flex-col gap-3'>
        <CardSkel />
        <CardSkel />
      </div>
    </div>
  )
}

function CardSkel() {
  return (
    <div className='border-line flex animate-pulse items-center justify-between rounded-2xl border px-5 py-4'>
      <div className='flex flex-col gap-2'>
        <Skel className='h-5 w-32' />
        <Skel className='h-3 w-16' />
      </div>
      <Skel className='h-4 w-12' />
    </div>
  )
}
