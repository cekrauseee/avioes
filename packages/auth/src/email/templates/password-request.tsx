import { Body, Button, Container, Font, Head, Heading, Hr, Html, Img, Preview, Text } from '@react-email/components'
import { t } from '@airplanes/i18n'
import type { Locale } from '@airplanes/types'
import { COLORS, FONT_BODY, FONT_DISPLAY, FRAUNCES_FONTS } from './shared'

const BASE_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

export function PasswordRequestEmail({ type, url, locale = 'pt' }: { type: 'change' | 'create'; url: string; locale?: Locale }) {
  const htmlLang = locale === 'pt' ? 'pt-BR' : 'en'
  const previewKey = type === 'change' ? 'email.passwordPreviewChange' : 'email.passwordPreviewCreate'
  const headingLine1Key = type === 'change' ? 'email.passwordHeadingLine1Change' : 'email.passwordHeadingLine1Create'
  const bodyKey = type === 'change' ? 'email.passwordBodyChange' : 'email.passwordBodyCreate'
  const buttonKey = type === 'change' ? 'email.passwordButtonChange' : 'email.passwordButtonCreate'

  return (
    <Html lang={htmlLang}>
      <Head>
        {FRAUNCES_FONTS.map((f, i) => (
          <Font
            key={i}
            {...f}
          />
        ))}
      </Head>
      <Preview>{t(locale, previewKey)}</Preview>
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
          <Img
            src={`${BASE_URL}/onboarding-hero-light.png`}
            width={140}
            height={140}
            alt=''
            style={{ margin: '0 auto', display: 'block' }}
          />

          <Text style={{ margin: '24px 0 0 0', fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: '14px', color: COLORS.inkFaint }}>
            {t(locale, 'email.passwordBrand')}
          </Text>

          <Heading
            as='h1'
            style={{
              margin: '20px 0 0 0',
              fontFamily: FONT_DISPLAY,
              fontWeight: 400,
              fontSize: '34px',
              lineHeight: '0.95',
              letterSpacing: '-0.02em',
              color: COLORS.ink
            }}
          >
            {t(locale, headingLine1Key)}
            <br />
            <span style={{ color: COLORS.sage, fontStyle: 'italic' }}>{t(locale, 'email.passwordHeadingItalic')}</span>
          </Heading>

          <Text style={{ margin: '12px 0 0 0', fontSize: '14px', color: COLORS.inkFaint, lineHeight: '1.5' }}>{t(locale, bodyKey)}</Text>

          <Button
            href={url}
            style={{
              display: 'block',
              margin: '28px 0 0 0',
              padding: '14px 28px',
              backgroundColor: COLORS.sage,
              color: COLORS.paper,
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: FONT_BODY,
              fontWeight: 500,
              textAlign: 'center',
              textDecoration: 'none'
            }}
          >
            {t(locale, buttonKey)}
          </Button>

          <Hr style={{ margin: '32px 0 20px 0', border: 'none', borderTop: `1px solid ${COLORS.line}` }} />

          <Text style={{ margin: 0, fontSize: '12px', color: COLORS.inkFaint, lineHeight: '1.6' }}>{t(locale, 'email.passwordFooter')}</Text>
        </Container>

        <Text style={{ margin: '20px auto 0 auto', maxWidth: '420px', textAlign: 'center', fontSize: '11px', color: COLORS.inkFaint }}>
          {t(locale, 'email.passwordTagline')}
        </Text>
      </Body>
    </Html>
  )
}

export default PasswordRequestEmail
