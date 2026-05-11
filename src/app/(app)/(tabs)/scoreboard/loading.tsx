import { Skel } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className='flex-1 overflow-hidden'>
      <div className='flex h-full flex-col'>
        <header className='px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-2'>
          <div className='flex items-center justify-between'>
            <Skel className='h-8 w-24' />
            <Skel className='h-10 w-10 rounded-full' />
          </div>
          <Skel className='mt-2 h-3 w-48' />

          <section className='relative mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-2'>
            <ScoreSkel align='left' />
            <Skel className='h-5 w-7' />
            <ScoreSkel align='right' />
          </section>

          <Skel className='mt-8 h-3 w-32' />
        </header>

        <div className='scroll-area fade-scroll flex-1 overflow-y-auto px-5 pb-8'>
          <ul className='divide-line divide-y'>
            {Array.from({ length: 5 }).map((_, i) => (
              <li
                key={i}
                className='flex items-baseline justify-between py-2.5'
              >
                <Skel className='h-4 w-24' />
                <Skel className='h-3 w-16' />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function ScoreSkel({ align }: { align: 'left' | 'right' }) {
  return (
    <div className={`flex flex-col gap-2 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <Skel className='aspect-square w-14 rounded-2xl' />
      <Skel className='h-3 w-16' />
      <Skel className='h-10 w-14' />
      <Skel className='h-3 w-20' />
    </div>
  )
}
