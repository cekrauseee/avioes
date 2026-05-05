import 'server-only'

import { render } from '@react-email/render'
import { Resend } from 'resend'
import { InviteEmail } from '../emails/invite'
import { OtpLoginEmail } from '../emails/otp-login'
import { tf } from './i18n'
import type { Locale } from './types'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = process.env.EMAIL_FROM ?? 'Aviões <onboarding@resend.dev>'

export async function sendOtpEmail(email: string, otp: string, expiresInMinutes: number, locale: Locale = 'pt'): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[email] RESEND_API_KEY not set. OTP for ${email}: ${otp}`)
      return
    }
    throw new Error('RESEND_API_KEY is not configured')
  }

  const html = await render(
    <OtpLoginEmail
      otp={otp}
      expiresInMinutes={expiresInMinutes}
      locale={locale}
    />
  )
  const subject = tf(locale, 'email.otpSubject', { otp })
  const text = tf(locale, 'email.otpPlainText', { otp, n: expiresInMinutes })

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html,
    text
  })

  if (error) throw new Error(error.message)
}

export async function sendInviteEmail(email: string, inviterName: string, groupName: string, inviteUrl: string, locale: Locale = 'pt'): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[email] RESEND_API_KEY not set. Invite for ${email}: ${inviteUrl}`)
      return
    }
    throw new Error('RESEND_API_KEY is not configured')
  }

  const html = await render(
    <InviteEmail
      inviterName={inviterName}
      groupName={groupName}
      inviteUrl={inviteUrl}
      locale={locale}
    />
  )
  const subject = tf(locale, 'email.inviteSubject', { name: inviterName })
  const text = tf(locale, 'email.invitePlainText', { name: inviterName, group: groupName, url: inviteUrl })

  const { error } = await resend.emails.send({ from: FROM, to: email, subject, html, text })
  if (error) throw new Error(error.message)
}
