import { Skel } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)]'>
      <div className='flex items-center justify-between gap-3'>
        <Skel className='h-4 w-14' />
        <Skel className='h-9 w-20 rounded-full' />
      </div>

      <div className='mt-10 flex flex-col gap-3'>
        <Skel className='h-9 w-40' />
        <Skel className='h-9 w-28' />
      </div>

      <div className='mt-8 flex flex-col gap-2'>
        <Skel className='h-3 w-32' />
        <div className='flex gap-2'>
          <Skel className='min-h-12 flex-1 rounded-xl' />
          <Skel className='h-12 w-20 rounded-xl' />
        </div>
      </div>

      <div className='mt-6 flex flex-col gap-3'>
        <MemberSkel />
        <MemberSkel />
      </div>
    </div>
  )
}

function MemberSkel() {
  return (
    <div className='border-line flex animate-pulse items-center gap-3 rounded-xl border px-4 py-3'>
      <Skel className='h-7 w-7 rounded-full' />
      <div className='flex flex-1 flex-col gap-1.5'>
        <Skel className='h-4 w-28' />
        <Skel className='h-3 w-40' />
      </div>
    </div>
  )
}
