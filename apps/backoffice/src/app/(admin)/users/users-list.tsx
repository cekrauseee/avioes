'use client'

import type { AdminUserRow } from '@airplanes/db/store-admin'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { listUsers } from '../../../actions/admin'

type Data = { items: AdminUserRow[]; nextCursor: string | null }

export function UsersList({ initialData, initialSearch, initialStatus }: { initialData: Data; initialSearch: string; initialStatus: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [isPending, startTransition] = useTransition()

  const applyFilters = useCallback(
    (q: string, s: string) => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (s && s !== 'all') params.set('status', s)
      router.push(`/users${params.size > 0 ? '?' + params.toString() : ''}`)
    },
    [router]
  )

  const loadMore = () => {
    if (!data.nextCursor) return
    startTransition(async () => {
      const more = await listUsers({ search: searchParams.get('q') ?? '', status: searchParams.get('status') ?? 'all', cursor: data.nextCursor! })
      setData((prev) => ({ items: [...prev.items, ...more.items], nextCursor: more.nextCursor }))
    })
  }

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters(search, status)}
          className="rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sage"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            applyFilters(search, e.target.value)
          }}
          className="rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none"
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="deleted">Deletados</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-paper">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-faint">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">País</th>
              <th className="px-4 py-3 font-medium">Flags</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-faint">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {data.items.map((user) => (
              <tr key={user.id} className="border-b border-line last:border-0 hover:bg-bg-soft">
                <td className="px-4 py-3">
                  <Link href={`/users/${user.id}`} className="font-medium">
                    {user.firstName ?? user.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">{user.email}</td>
                <td className="px-4 py-3 text-ink-soft">{user.username ?? '—'}</td>
                <td className="px-4 py-3 text-ink-soft">{user.country ?? '—'}</td>
                <td className="px-4 py-3">
                  {user.featureFlags.map((f) => (
                    <span key={f} className="mr-1 inline-block rounded bg-sage-soft px-1.5 py-0.5 text-xs text-sage">
                      {f}
                    </span>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge deleted={!!user.deletedAt} />
                </td>
                <td className="px-4 py-3 text-ink-faint">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.nextCursor && (
        <button
          onClick={loadMore}
          disabled={isPending}
          className="mt-4 rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:bg-bg-soft disabled:opacity-50"
        >
          {isPending ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
    </div>
  )
}

function StatusBadge({ deleted }: { deleted: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${deleted ? 'bg-clay-soft text-clay' : 'bg-sage-soft text-sage'}`}
    >
      {deleted ? 'Deletado' : 'Ativo'}
    </span>
  )
}
