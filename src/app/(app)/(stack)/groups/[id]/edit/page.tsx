import { EditGroupScreen } from '@/components/edit-group-screen'
import { requireGroupOwner } from '@/lib/auth-guards'
import { readLocale } from '@/lib/cookies'
import { t } from '@/lib/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'settings.editGroup') }
}

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireGroupOwner(id, `/groups/${id}/edit`)
  return <EditGroupScreen groupId={id} />
}
