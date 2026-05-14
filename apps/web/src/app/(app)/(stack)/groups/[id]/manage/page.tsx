import { ManageGroupScreen } from '@/components/manage-group-screen'
import { readLocale } from '@airplanes/auth/cookies'
import { requireGroupOwner } from '@airplanes/auth/guards'
import { t } from '@airplanes/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'groups.manage.title') }
}

export default async function ManageGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireGroupOwner(id, `/groups/${id}/manage`)
  return <ManageGroupScreen groupId={id} />
}
