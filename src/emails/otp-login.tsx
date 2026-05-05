import { Body, Container, Font, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'

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
const FONT_MONO = '"Geist Mono", "SF Mono", Menlo, Consolas, monospace'

export function OtpLoginEmail({ otp, expiresInMinutes = 5 }: { otp: string; expiresInMinutes?: number }) {
  return (
    <Html lang='pt-BR'>
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
      <Preview>seu código de acesso é {otp}</Preview>
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
          <Text style={{ margin: 0, fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: '14px', color: COLORS.inkFaint }}>aviões</Text>

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
            seu código
            <br />
            <span style={{ color: COLORS.sage, fontStyle: 'italic' }}>de acesso</span>
          </Heading>

          <Text style={{ margin: '12px 0 0 0', fontSize: '14px', color: COLORS.inkFaint, lineHeight: '1.5' }}>
            digite o código abaixo para entrar. ele expira em {expiresInMinutes} minutos.
          </Text>

          <Section
            style={{
              margin: '32px 0 0 0',
              padding: '24px',
              backgroundColor: COLORS.bg,
              borderRadius: '14px',
              textAlign: 'center'
            }}
          >
            <Text
              style={{
                margin: 0,
                fontFamily: FONT_MONO,
                fontSize: '34px',
                letterSpacing: '0.4em',
                color: COLORS.ink,
                fontWeight: 500
              }}
            >
              {otp}
            </Text>
          </Section>

          <Hr style={{ margin: '32px 0 20px 0', border: 'none', borderTop: `1px solid ${COLORS.line}` }} />

          <Text style={{ margin: 0, fontSize: '12px', color: COLORS.inkFaint, lineHeight: '1.6' }}>
            se você não pediu este código, pode ignorar este e-mail. ninguém terá acesso à sua conta sem ele.
          </Text>
        </Container>

        <Text style={{ margin: '20px auto 0 auto', maxWidth: '420px', textAlign: 'center', fontSize: '11px', color: COLORS.inkFaint }}>
          aviões · um diário de aviões para vocês
        </Text>
      </Body>
    </Html>
  )
}

export default OtpLoginEmail
