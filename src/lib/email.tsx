import 'server-only'

import { render } from '@react-email/render'
import { Resend } from 'resend'
import { OtpLoginEmail } from '../emails/otp-login'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = process.env.EMAIL_FROM ?? 'Aviões <onboarding@resend.dev>'

export async function sendOtpEmail(email: string, otp: string, expiresInMinutes: number): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[email] RESEND_API_KEY not set. OTP for ${email}: ${otp}`)
      return
    }
    throw new Error('RESEND_API_KEY is not configured')
  }

  const html = await render(<OtpLoginEmail otp={otp} expiresInMinutes={expiresInMinutes} />)
  const text = `Seu código de acesso para Aviões: ${otp}\n\nEle expira em ${expiresInMinutes} minutos.`

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `${otp} é seu código de acesso · Aviões`,
    html,
    text
  })

  if (error) throw new Error(error.message)
}
