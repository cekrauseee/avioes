import { getStats } from '../../actions/admin'

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Usuários" active={stats.users.active} deleted={stats.users.deleted} total={stats.users.total} href="/users" />
        <StatCard title="Grupos" active={stats.groups.active} deleted={stats.groups.deleted} total={stats.groups.total} href="/groups" />
        <StatCard title="Eventos" active={stats.events.active} deleted={stats.events.deleted} total={stats.events.total} />
      </div>
    </div>
  )
}

function StatCard({ title, active, deleted, total, href }: { title: string; active: number; deleted: number; total: number; href?: string }) {
  const Tag = href ? 'a' : 'div'
  return (
    <Tag
      {...(href ? { href } : {})}
      className="rounded-xl border border-line bg-paper p-5 no-underline transition-shadow hover:shadow-sm"
    >
      <p className="text-sm font-medium text-ink-soft">{title}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{total}</p>
      <div className="mt-2 flex gap-3 text-xs text-ink-faint">
        <span>{active} ativos</span>
        <span>{deleted} deletados</span>
      </div>
    </Tag>
  )
}
