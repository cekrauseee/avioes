import { Skel } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className='flex min-h-0 flex-1 flex-col px-5 py-3'>
      <Skel className='min-h-0 flex-1 rounded-xl' />
    </div>
  )
}
