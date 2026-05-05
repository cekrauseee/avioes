import { Skel } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)]'>
      {/* header */}
      <div className='flex items-center justify-between gap-3'>
        <Skel className='h-4 w-14' />
        <Skel className='h-11 w-24 rounded-full' />
      </div>

      {/* heading */}
      <div className='mt-12 flex flex-col gap-3'>
        <Skel className='h-10 w-48' />
        <Skel className='h-10 w-36' />
        <Skel className='mt-1 h-4 w-56' />
      </div>

      {/* form fields */}
      <div className='mt-10 flex flex-col gap-4'>
        <div className='flex flex-col gap-1.5'>
          <Skel className='h-3 w-20' />
          <Skel className='h-11 w-full rounded-xl' />
        </div>
        <div className='flex flex-col gap-1.5'>
          <Skel className='h-3 w-28' />
          <Skel className='h-11 w-full rounded-xl' />
        </div>
        <Skel className='mt-2 h-12 w-full rounded-xl' />
      </div>
    </div>
  )
}
