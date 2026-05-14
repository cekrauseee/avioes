import { EditGroupScreen } from '@/components/edit-group-screen'
import { readLocale } from '@airplanes/auth/cookies'
import { requireGroupOwner } from '@airplanes/auth/guards'
import { t } from '@airplanes/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'settings.editGroup') }
}

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireGroupOwner(id, `/groups/${id}/edit`)
  return <EditGroupScreen groupId={id} />
}
