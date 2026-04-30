import { Skel } from '../../components/skeleton'

export default function Loading() {
  return (
    <div className='flex-1 overflow-hidden'>
      <div className='flex h-full flex-col'>
        <header className='px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-3'>
          <div className='flex items-center justify-between'>
            <Skel className='h-8 w-28' />
            <Skel className='h-10 w-10 rounded-full' />
          </div>
          <Skel className='mt-2 h-3 w-44' />
        </header>

        <div className='scroll-area fade-scroll flex-1 overflow-y-auto px-5 pt-2 pb-8'>
          <ol className='relative space-y-4 pl-5'>
            <span
              aria-hidden
              className='dotted-line absolute top-2 bottom-2 left-[5px] w-px'
            />
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className='relative'
              >
                <span
                  aria-hidden
                  className='bg-line absolute top-2 -left-[18px] h-2 w-2 rounded-full'
                />
                <article className={`bg-paper rounded-xl p-3 ${i % 2 === 0 ? 'rotate-[-0.3deg]' : 'rotate-[0.3deg]'}`}>
                  <Skel className='h-4 w-3/4' />
                  <Skel className='mt-2 h-3 w-1/2' />
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
