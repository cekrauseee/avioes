import { ManageGroupScreen } from '@/components/manage-group-screen'
import { requireGroupOwner } from '@/lib/auth-guards'
import { readLocale } from '@/lib/cookies'
import { t } from '@/lib/i18n'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'groups.manage.title') }
}

export default async function ManageGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireGroupOwner(id, `/groups/${id}/manage`)
  return <ManageGroupScreen groupId={id} />
}
