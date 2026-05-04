import { Skel } from '../../components/skeleton'

export default function Loading() {
  return (
    <div className='flex-1 overflow-hidden'>
      <div className='flex h-full flex-col'>
        <header className='px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-3'>
          <Skel className='h-8 w-28' />
          <Skel className='mt-2 h-3 w-36' />
        </header>

        <div className='scroll-area flex-1 overflow-y-auto px-5 pt-2 pb-8'>
          <Skel className='h-3 w-16' />
          <div className='mt-3 grid grid-cols-3 gap-3'>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skel
                key={i}
                className='aspect-[4/3] rounded-xl'
              />
            ))}
          </div>
          <Skel className='mt-8 h-3 w-12' />
          <div className='mt-3 grid grid-cols-3 gap-3'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skel
                key={i}
                className='h-16 rounded-xl'
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
