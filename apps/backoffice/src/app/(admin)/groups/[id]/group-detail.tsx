'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { removeGroupMember, restoreGroup, softDeleteGroup, updateGroup } from '../../../../actions/admin'

type GroupData = {
  id: string
  name: string
  ownerId: string
  deletedAt: Date | null
  createdAt: number
  members: {
    userId: string
    role: string
    joinedAt: number
    deletedAt: Date | null
    userName: string
    userEmail: string
    userImage: string | null
  }[]
  eventCount: number
}

export function GroupDetail({ group }: { group: GroupData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [name, setName] = useState(group.name)
  const [transferTo, setTransferTo] = useState('')

  const handleSave = () => {
    startTransition(async () => {
      setMessage('')
      const patch: { name?: string; ownerId?: string } = {}
      if (name !== group.name) patch.name = name
      if (transferTo && transferTo !== group.ownerId) patch.ownerId = transferTo
      if (Object.keys(patch).length === 0) return
      await updateGroup(group.id, patch)
      setMessage('Salvo')
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!confirm('Deletar este grupo? Remove membros e eventos junto.')) return
    startTransition(async () => {
      setMessage('')
      await softDeleteGroup(group.id)
      router.refresh()
    })
  }

  const handleRestore = () => {
    startTransition(async () => {
      setMessage('')
      await restoreGroup(group.id)
      router.refresh()
    })
  }

  const handleRemoveMember = (userId: string) => {
    if (!confirm('Remover este membro?')) return
    startTransition(async () => {
      setMessage('')
      const result = await removeGroupMember(group.id, userId)
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/groups" className="mb-4 inline-block text-sm text-ink-faint hover:text-ink-soft">
        ← voltar
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">{group.name}</h1>

      {group.deletedAt && (
        <div className="mb-4 rounded-lg bg-clay-soft p-3 text-sm text-clay">
          Grupo deletado em {new Date(group.deletedAt).toLocaleDateString('pt-BR')}
        </div>
      )}

      <section className="mb-6 rounded-xl border border-line bg-paper p-5">
        <h2 className="mb-4 text-sm font-medium text-ink-faint">Identidade</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-ink-faint">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-line px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-sage"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-faint">Transferir propriedade</label>
            <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className="rounded border border-line px-2 py-1.5 text-sm">
              <option value="">Manter dono atual</option>
              {group.members
                .filter((m) => m.userId !== group.ownerId)
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userName} ({m.userEmail})
                  </option>
                ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="mt-4 rounded-lg bg-sage px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </section>

      <section className="mb-6 rounded-xl border border-line bg-paper p-5">
        <h2 className="mb-4 text-sm font-medium text-ink-faint">Membros ({group.members.length})</h2>
        <div className="space-y-2">
          {group.members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
              <div>
                <Link href={`/users/${m.userId}`} className="font-medium">
                  {m.userName}
                </Link>
                <span className="ml-2 text-ink-faint">{m.userEmail}</span>
                {m.userId === group.ownerId && <span className="ml-2 rounded bg-sage-soft px-1.5 py-0.5 text-xs text-sage">dono</span>}
              </div>
              {m.userId !== group.ownerId && (
                <button onClick={() => handleRemoveMember(m.userId)} disabled={isPending} className="text-xs text-clay hover:underline disabled:opacity-50">
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-line bg-paper p-5">
        <h2 className="mb-4 text-sm font-medium text-ink-faint">Eventos</h2>
        <p className="text-sm text-ink-soft">{group.eventCount} eventos ativos</p>
      </section>

      <section className="rounded-xl border border-line bg-paper p-5">
        <h2 className="mb-4 text-sm font-medium text-ink-faint">Status</h2>
        {group.deletedAt ? (
          <button onClick={handleRestore} disabled={isPending} className="rounded-lg bg-sage px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Restaurar grupo
          </button>
        ) : (
          <button onClick={handleDelete} disabled={isPending} className="rounded-lg bg-clay px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Deletar grupo
          </button>
        )}
      </section>

      {message && <p className="mt-4 text-sm text-sage">{message}</p>}
    </div>
  )
}
