import { Body, Button, Container, Font, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'
import { t, tf } from '../lib/i18n'
import type { Locale } from '../lib/types'

const COLORS = {
  bg: '#F6F1E7',
  ink: '#1F2A24',
  inkSoft: '#4A5A52',
  inkFaint: '#8A9890',
  sage: '#7C9A82',
  line: '#1F2A2418',
  paper: '#FFFFFF'
}

const FONT_DISPLAY = 'Fraunces, "Times New Roman", Georgia, serif'
const FONT_BODY = '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'

export function InviteEmail({
  inviterName,
  groupName,
  inviteUrl,
  locale = 'pt'
}: {
  inviterName: string
  groupName: string
  inviteUrl: string
  locale?: Locale
}) {
  const htmlLang = locale === 'pt' ? 'pt-BR' : 'en'

  return (
    <Html lang={htmlLang}>
      <Head>
        <Font
          fontFamily='Fraunces'
          fallbackFontFamily='serif'
          webFont={{
            url: 'https://fonts.gstatic.com/s/fraunces/v37/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk.woff2',
            format: 'woff2'
          }}
          fontWeight={400}
          fontStyle='italic'
        />
      </Head>
      <Preview>{tf(locale, 'email.invitePreview', { name: inviterName, group: groupName })}</Preview>
      <Body style={{ backgroundColor: COLORS.bg, margin: 0, padding: '32px 16px', fontFamily: FONT_BODY, color: COLORS.ink }}>
        <Container
          style={{
            maxWidth: '420px',
            margin: '0 auto',
            backgroundColor: COLORS.paper,
            borderRadius: '20px',
            padding: '36px 32px',
            border: `1px solid ${COLORS.line}`
          }}
        >
          <Text style={{ margin: 0, fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: '14px', color: COLORS.inkFaint }}>
            {t(locale, 'email.inviteBrand')}
          </Text>

          <Heading
            as='h1'
            style={{
              margin: '28px 0 0 0',
              fontFamily: FONT_DISPLAY,
              fontWeight: 400,
              fontSize: '34px',
              lineHeight: '0.95',
              letterSpacing: '-0.02em',
              color: COLORS.ink
            }}
          >
            {t(locale, 'email.inviteHeadingLine1')}
            <br />
            <span style={{ color: COLORS.sage, fontStyle: 'italic' }}>{t(locale, 'email.inviteHeadingItalic')}</span>
          </Heading>

          <Text style={{ margin: '12px 0 0 0', fontSize: '14px', color: COLORS.inkFaint, lineHeight: '1.5' }}>
            {tf(locale, 'email.inviteBody', { name: inviterName, group: groupName })}
          </Text>

          <Button
            href={inviteUrl}
            style={{
              display: 'block',
              margin: '28px 0 0 0',
              padding: '14px 28px',
              backgroundColor: COLORS.ink,
              color: COLORS.paper,
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: FONT_BODY,
              fontWeight: 500,
              textAlign: 'center',
              textDecoration: 'none'
            }}
          >
            {t(locale, 'email.inviteButton')}
          </Button>

          <Hr style={{ margin: '32px 0 20px 0', border: 'none', borderTop: `1px solid ${COLORS.line}` }} />

          <Text style={{ margin: 0, fontSize: '12px', color: COLORS.inkFaint, lineHeight: '1.6' }}>{t(locale, 'email.inviteFooter')}</Text>
        </Container>

        <Text style={{ margin: '20px auto 0 auto', maxWidth: '420px', textAlign: 'center', fontSize: '11px', color: COLORS.inkFaint }}>
          {t(locale, 'email.inviteTagline')}
        </Text>
      </Body>
    </Html>
  )
}

export default InviteEmail
