import type { Metadata } from 'next'
import { InviteScreen } from '@/components/invite-screen'
import { getCurrentUser } from '@/lib/auth-guards'
import { readLocale } from '@/lib/cookies'
import { t } from '@/lib/i18n'
import { readInvitationByToken } from '@/lib/store'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const [locale, invitation] = await Promise.all([readLocale(), readInvitationByToken(token)])
  const isPending = invitation?.status === 'pending'

  const title = isPending && invitation.groupName ? `${invitation.groupName} · ${t(locale, 'invite.metaTitle')}` : t(locale, 'invite.metaTitle')
  const description = isPending && invitation.invitedByFirstName ? t(locale, 'invite.ogDescription') : t(locale, 'invite.ogDescriptionGeneric')

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    }
  }
}

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
