import { listUsers } from '../../../actions/admin'
import { UsersList } from './users-list'

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams
  const data = await listUsers({ search: params.q, status: params.status || 'all' })

  return (
    <div>
      <h1 className='mb-6 text-2xl font-semibold'>Usuários</h1>
      <UsersList
        key={`${params.q ?? ''}-${params.status ?? 'all'}`}
        initialData={data}
        initialSearch={params.q ?? ''}
        initialStatus={params.status ?? 'all'}
      />
    </div>
  )
}
