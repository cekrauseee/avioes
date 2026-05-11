import { InviteScreen } from '@/components/invite-screen'
import { getCurrentUser } from '@/lib/auth-guards'
import { readInvitationByToken } from '@/lib/store'

function isExpired(expiresAt: number): boolean {
  return expiresAt <= Date.now()
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [invitation, user] = await Promise.all([readInvitationByToken(token), getCurrentUser()])

  if (!invitation) {
    return (
      <InviteScreen
        token={token}
        status='not_found'
      />
    )
  }

  const expired = invitation.status === 'pending' && isExpired(invitation.expiresAt)
  const emailMatch = user && user.email.toLowerCase() === invitation.invitedEmail.toLowerCase()
  const canSeeDetails = emailMatch && user.emailVerified

  return (
    <InviteScreen
      token={token}
      status={expired ? 'expired' : invitation.status}
      groupName={canSeeDetails ? invitation.groupName : undefined}
      invitedByFirstName={canSeeDetails ? invitation.invitedByFirstName : undefined}
      invitedByImage={canSeeDetails ? (invitation.invitedByImage ?? undefined) : undefined}
      isAuthenticated={!!user}
      emailMatch={emailMatch ?? false}
      emailVerified={user?.emailVerified ?? false}
    />
  )
}
