import { Skel } from '../../components/skeleton'

export default function Loading() {
  return (
    <div className='flex h-full flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]'>
      <div className='flex items-center justify-between'>
        <Skel className='h-3 w-14' />
        <Skel className='h-3 w-20' />
      </div>

      <div className='mt-6 flex items-center justify-center gap-2'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skel
            key={i}
            className='h-1.5 w-1.5 rounded-full'
          />
        ))}
      </div>

      <div className='mt-10 flex flex-col gap-3'>
        <Skel className='h-9 w-40' />
        <Skel className='h-9 w-32' />
        <Skel className='mt-2 h-3 w-56' />
      </div>

      <div className='mt-10 flex flex-col gap-4'>
        <div className='flex flex-col gap-1.5'>
          <Skel className='h-3 w-12' />
          <Skel className='h-12 w-full rounded-xl' />
        </div>
        <div className='flex flex-col gap-1.5'>
          <Skel className='h-3 w-16' />
          <Skel className='h-12 w-full rounded-xl' />
        </div>
      </div>

      <div className='mt-auto flex flex-col gap-3 pt-6'>
        <Skel className='h-12 w-full rounded-xl' />
        <Skel className='h-9 w-24 rounded-full' />
      </div>
    </div>
  )
}
