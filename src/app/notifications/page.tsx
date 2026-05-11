import { NotificationsScreen } from '@/components/notifications-screen'
import { requireOnboardedUser } from '@/lib/auth-guards'

export default async function NotificationsPage() {
  await requireOnboardedUser('/notifications')
  return <NotificationsScreen />
}
