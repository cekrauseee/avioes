import { WorldMap } from '@/components/world-map'
import { requireActiveGroup } from '@/lib/auth-guards'
import { readLocale } from '@/lib/cookies'
import { t } from '@/lib/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'world.title') }
}

export default async function WorldPage() {
  await requireActiveGroup('/world')
  const locale = await readLocale()
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <WorldMap locale={locale} />
    </div>
  )
}
