import { t } from '../lib/i18n'

export default function Loading() {
  return (
    <div className='flex-1 overflow-hidden'>
      <main className='relative flex h-full flex-col items-center justify-center px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]'>
        <div className='bg-sage h-2.5 w-2.5 animate-pulse rounded-full' />
        <p className='font-display text-ink-soft mt-6 text-sm italic'>{t('pt', 'loading.text')}</p>
      </main>
    </div>
  )
}
