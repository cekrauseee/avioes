import { Skel } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <header className='px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-1'>
        <div className='flex items-center justify-between'>
          <Skel className='h-8 w-24' />
          <div className='flex items-center gap-2'>
            <Skel className='h-5 w-5 rounded-full' />
            <Skel className='h-10 w-10 rounded-full' />
          </div>
        </div>
      </header>

      <div className='px-5 pt-2'>
        <div className='bg-bg-soft/60 border-line inline-flex gap-0.5 rounded-full border p-0.5'>
          <span className='bg-line/60 block h-7 w-16 animate-pulse rounded-full' />
          <span className='bg-line/60 block h-7 w-16 animate-pulse rounded-full opacity-30' />
        </div>
      </div>

      <div className='flex-1 px-5 py-4'>
        <Skel className='h-4 w-40' />
        <Skel className='mt-2 h-3 w-20' />

        <section className='relative mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2'>
          <ScoreSkel align='left' />
          <Skel className='h-5 w-7' />
          <ScoreSkel align='right' />
        </section>

        <Skel className='mt-8 h-3 w-24' />

        <ul className='divide-line mt-1 divide-y'>
          {Array.from({ length: 4 }).map((_, i) => (
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
  )
}

function ScoreSkel({ align }: { align: 'left' | 'right' }) {
  return (
    <div className={`flex flex-col gap-2 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <Skel className='h-12 w-12 rounded-full' />
      <Skel className='h-3 w-16' />
      <Skel className='h-10 w-14' />
      <Skel className='h-3 w-20' />
    </div>
  )
}
