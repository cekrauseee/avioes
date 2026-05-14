import { Skel } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className='flex-1 overflow-hidden'>
      <div className='flex h-full flex-col pt-[max(env(safe-area-inset-top),1.25rem)]'>
        <div className='px-5 pb-1'>
          <Skel className='h-8 w-28' />
        </div>

        <div className='px-5 pt-2 pb-0'>
          <Skel className='h-10 w-64 rounded-full' />
        </div>

        <div className='flex-1 overflow-hidden px-5 py-5'>
          <div className='flex flex-col gap-6'>
            <section>
              <Skel className='mb-3 h-3 w-12' />
              <div className='grid grid-cols-3 gap-2.5'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skel
                    key={i}
                    className='h-16 rounded-xl'
                  />
                ))}
              </div>
            </section>

            <section>
              <Skel className='mb-3 h-3 w-16' />
              <div className='grid grid-cols-3 gap-2.5'>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skel
                    key={i}
                    className='aspect-[3/2] rounded-xl'
                  />
                ))}
              </div>
            </section>

            <section>
              <Skel className='mb-3 h-3 w-14' />
              <div className='grid grid-cols-2 gap-2.5'>
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skel
                    key={i}
                    className='h-12 rounded-xl'
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
