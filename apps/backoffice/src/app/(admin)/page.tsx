import { detectLocaleFromHeader, t } from '@airplanes/i18n'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getStats } from '../../actions/admin'

export default async function DashboardPage() {
  const [stats, h] = await Promise.all([getStats(), headers()])
  const locale = detectLocaleFromHeader(h.get('accept-language'))

  return (
    <div>
      <h1 className='mb-6 text-2xl font-semibold'>{t(locale, 'admin.dashboard.title')}</h1>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard
          title={t(locale, 'admin.dashboard.users')}
          active={stats.users.active}
          deleted={stats.users.deleted}
          total={stats.users.total}
          activeLabel={t(locale, 'admin.dashboard.usersActive')}
          deletedLabel={t(locale, 'admin.dashboard.usersDeleted')}
          href='/users'
        />
        <StatCard
          title={t(locale, 'admin.dashboard.groups')}
          active={stats.groups.active}
          deleted={stats.groups.deleted}
          total={stats.groups.total}
          activeLabel={t(locale, 'admin.dashboard.groupsActive')}
          deletedLabel={t(locale, 'admin.dashboard.groupsDeleted')}
          href='/groups'
        />
        <StatCard
          title={t(locale, 'admin.dashboard.events')}
          active={stats.events.active}
          deleted={stats.events.deleted}
          total={stats.events.total}
          activeLabel={t(locale, 'admin.dashboard.eventsActive')}
          deletedLabel={t(locale, 'admin.dashboard.eventsDeleted')}
        />
      </div>
    </div>
  )
}

function StatCard({
  title,
  active,
  deleted,
  total,
  activeLabel,
  deletedLabel,
  href
}: {
  title: string
  active: number
  deleted: number
  total: number
  activeLabel: string
  deletedLabel: string
  href?: string
}) {
  const inner = (
    <>
      <p className='text-ink-soft text-sm font-medium'>{title}</p>
      <p className='mt-2 text-3xl font-semibold tabular-nums'>{total}</p>
      <div className='text-ink-faint mt-2 flex gap-3 text-xs'>
        <span>
          {active} {activeLabel}
        </span>
        <span>
          {deleted} {deletedLabel}
        </span>
      </div>
    </>
  )
  const cls = 'border-line bg-paper rounded-xl border p-5 no-underline transition-shadow hover:shadow-sm'
  return href ?
      <Link
        href={href}
        className={cls}
      >
        {inner}
      </Link>
    : <div className={cls}>{inner}</div>
}
