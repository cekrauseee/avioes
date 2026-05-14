'use client'

import type { Locale } from '@airplanes/types'
import type { AdminGroupRow } from '@airplanes/db/store-admin'
import { DATE_LOCALE, t } from '@airplanes/i18n'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { listGroups } from '../../../actions/admin'

type Data = { items: AdminGroupRow[]; nextCursor: string | null }

export function GroupsList({ initialData, initialSearch, initialStatus, locale }: { initialData: Data; initialSearch: string; initialStatus: string; locale: Locale }) {
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
          placeholder={t(locale, 'admin.search')}
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
          <option value='all'>{t(locale, 'admin.filter.all')}</option>
          <option value='active'>{t(locale, 'admin.filter.active')}</option>
          <option value='deleted'>{t(locale, 'admin.filter.deleted')}</option>
        </select>
      </div>

      <div className='border-line bg-paper overflow-x-auto rounded-xl border'>
        <table className='w-full text-left text-sm'>
          <thead>
            <tr className='border-line text-ink-faint border-b text-xs'>
              <th className='px-4 py-3 font-medium'>{t(locale, 'admin.groups.name')}</th>
              <th className='px-4 py-3 font-medium'>{t(locale, 'admin.groups.owner')}</th>
              <th className='px-4 py-3 font-medium'>{t(locale, 'admin.groups.members')}</th>
              <th className='px-4 py-3 font-medium'>{t(locale, 'admin.groups.events')}</th>
              <th className='px-4 py-3 font-medium'>{t(locale, 'admin.groups.status')}</th>
              <th className='px-4 py-3 font-medium'>{t(locale, 'admin.groups.createdAt')}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className='text-ink-faint px-4 py-8 text-center'
                >
                  {t(locale, 'admin.groups.noResults')}
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
                    {group.deletedAt ? t(locale, 'admin.status.deleted') : t(locale, 'admin.status.active')}
                  </span>
                </td>
                <td className='text-ink-faint px-4 py-3'>{new Date(group.createdAt).toLocaleDateString(DATE_LOCALE[locale])}</td>
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
          {isPending ? t(locale, 'admin.loading') : t(locale, 'admin.groups.loadMore')}
        </button>
      )}
    </div>
  )
}
