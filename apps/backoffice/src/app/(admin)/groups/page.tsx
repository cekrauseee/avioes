import { detectLocaleFromHeader, t } from '@airplanes/i18n'
import { headers } from 'next/headers'
import { listGroups } from '../../../actions/admin'
import { GroupsList } from './groups-list'

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const [params, h] = await Promise.all([searchParams, headers()])
  const locale = detectLocaleFromHeader(h.get('accept-language'))
  const data = await listGroups({ search: params.q, status: params.status || 'all' })

  return (
    <div>
      <h1 className='mb-6 text-2xl font-semibold'>{t(locale, 'admin.groups.title')}</h1>
      <GroupsList
        key={`${params.q ?? ''}-${params.status ?? 'all'}`}
        initialData={data}
        initialSearch={params.q ?? ''}
        initialStatus={params.status ?? 'all'}
        locale={locale}
      />
    </div>
  )
}
