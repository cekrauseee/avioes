'use client'

import type { AdminGroupRow } from '@airplanes/db/store-admin'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { listGroups } from '../../../actions/admin'

type Data = { items: AdminGroupRow[]; nextCursor: string | null }

export function GroupsList({ initialData, initialSearch, initialStatus }: { initialData: Data; initialSearch: string; initialStatus: string }) {
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
      router.push(`/groups${params.size > 0 ? '?' + params.toString() : ''}`)
    },
    [router]
  )

  const loadMore = () => {
    if (!data.nextCursor) return
    startTransition(async () => {
      const more = await listGroups({
        search: searchParams.get('q') ?? '',
        status: searchParams.get('status') ?? 'all',
        cursor: data.nextCursor!
      })
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
              <th className="px-4 py-3 font-medium">Dono</th>
              <th className="px-4 py-3 font-medium">Membros</th>
              <th className="px-4 py-3 font-medium">Eventos</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-faint">
                  Nenhum grupo encontrado.
                </td>
              </tr>
            )}
            {data.items.map((group) => (
              <tr key={group.id} className="border-b border-line last:border-0 hover:bg-bg-soft">
                <td className="px-4 py-3">
                  <Link href={`/groups/${group.id}`} className="font-medium">
                    {group.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">{group.ownerName}</td>
                <td className="px-4 py-3 tabular-nums text-ink-soft">{group.memberCount}</td>
                <td className="px-4 py-3 tabular-nums text-ink-soft">{group.eventCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      group.deletedAt ? 'bg-clay-soft text-clay' : 'bg-sage-soft text-sage'
                    }`}
                  >
                    {group.deletedAt ? 'Deletado' : 'Ativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-faint">{new Date(group.createdAt).toLocaleDateString('pt-BR')}</td>
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
