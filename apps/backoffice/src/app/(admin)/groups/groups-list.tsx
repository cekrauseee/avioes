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
      <div className='mb-4 flex gap-3'>
        <input
          type='text'
          placeholder='Buscar…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters(search, status)}
          className='border-line bg-paper focus:ring-sage rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1'
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            applyFilters(search, e.target.value)
          }}
          className='border-line bg-paper rounded-lg border px-3 py-2 text-sm outline-none'
        >
          <option value='all'>Todos</option>
          <option value='active'>Ativos</option>
          <option value='deleted'>Deletados</option>
        </select>
      </div>

      <div className='border-line bg-paper overflow-x-auto rounded-xl border'>
        <table className='w-full text-left text-sm'>
          <thead>
            <tr className='border-line text-ink-faint border-b text-xs'>
              <th className='px-4 py-3 font-medium'>Nome</th>
              <th className='px-4 py-3 font-medium'>Dono</th>
              <th className='px-4 py-3 font-medium'>Membros</th>
              <th className='px-4 py-3 font-medium'>Eventos</th>
              <th className='px-4 py-3 font-medium'>Status</th>
              <th className='px-4 py-3 font-medium'>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className='text-ink-faint px-4 py-8 text-center'
                >
                  Nenhum grupo encontrado.
                </td>
              </tr>
            )}
            {data.items.map((group) => (
              <tr
                key={group.id}
                className='border-line hover:bg-bg-soft border-b last:border-0'
              >
                <td className='px-4 py-3'>
                  <Link
                    href={`/groups/${group.id}`}
                    className='font-medium'
                  >
                    {group.name}
                  </Link>
                </td>
                <td className='text-ink-soft px-4 py-3'>{group.ownerName}</td>
                <td className='text-ink-soft px-4 py-3 tabular-nums'>{group.memberCount}</td>
                <td className='text-ink-soft px-4 py-3 tabular-nums'>{group.eventCount}</td>
                <td className='px-4 py-3'>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      group.deletedAt ? 'bg-clay-soft text-clay' : 'bg-sage-soft text-sage'
                    }`}
                  >
                    {group.deletedAt ? 'Deletado' : 'Ativo'}
                  </span>
                </td>
                <td className='text-ink-faint px-4 py-3'>{new Date(group.createdAt).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.nextCursor && (
        <button
          onClick={loadMore}
          disabled={isPending}
          className='border-line text-ink-soft hover:bg-bg-soft mt-4 rounded-lg border px-4 py-2 text-sm disabled:opacity-50'
        >
          {isPending ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
    </div>
  )
}
