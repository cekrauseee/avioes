import 'server-only'

import { t, tf } from '@airplanes/i18n'
import type { Locale } from '@airplanes/types'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import { InviteEmail } from './templates/invite'
import { OtpLoginEmail } from './templates/otp-login'
import { PasswordRequestEmail } from './templates/password-request'

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

export async function sendPasswordEmail(email: string, type: 'change' | 'create', url: string, locale: Locale = 'pt'): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[email] RESEND_API_KEY not set. Password ${type} link for ${email}: ${url}`)
      return
    }
    throw new Error('RESEND_API_KEY is not configured')
  }

  const html = await render(
    <PasswordRequestEmail
      type={type}
      url={url}
      locale={locale}
    />
  )
  const subject = t(locale, type === 'change' ? 'email.passwordSubjectChange' : 'email.passwordSubjectCreate')
  const text = tf(locale, type === 'change' ? 'email.passwordPlainTextChange' : 'email.passwordPlainTextCreate', { url })

  const { error } = await resend.emails.send({ from: FROM, to: email, subject, html, text })
  if (error) throw new Error(error.message)
}
