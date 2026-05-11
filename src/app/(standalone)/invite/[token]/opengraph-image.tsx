import { readInvitationByToken } from '@/lib/store'
import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const alt = 'Aviões — convite'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BG = '#F6F1E7'
const INK = '#1F2A24'
const INK_SOFT = '#4A5A52'
const SAGE = '#7C9A82'
const CLAY = '#C97B5C'
const LINE = '#1F2A2418'

async function loadFraunces(): Promise<ArrayBuffer> {
  const res = await fetch('https://fonts.gstatic.com/s/fraunces/v32/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nBPMQ.ttf')
  return res.arrayBuffer()
}

function loadIllustration(): string {
  const buf = readFileSync(join(process.cwd(), 'public/og-invite-light.png'))
  return `data:image/png;base64,${buf.toString('base64')}`
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [invitation, fraunces] = await Promise.all([readInvitationByToken(token), loadFraunces()])
  const illustrationSrc = loadIllustration()

  const groupName = invitation?.groupName
  const inviterName = invitation?.invitedByFirstName
  const isPending = invitation?.status === 'pending'

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: BG,
        padding: '60px 80px',
        position: 'relative'
      }}
    >
      {/* border frame */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          right: 24,
          bottom: 24,
          border: `2px solid ${LINE}`,
          borderRadius: 24,
          display: 'flex'
        }}
      />

      {/* left: text content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          paddingRight: 40
        }}
      >
        {/* top label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24
          }}
        >
          <span style={{ fontSize: 18, color: INK_SOFT, letterSpacing: '0.08em' }}>AVIÕES</span>
        </div>

        {/* main heading */}
        {isPending && groupName ?
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}
          >
            <span
              style={{
                fontSize: 48,
                fontFamily: 'Fraunces',
                color: INK,
                lineHeight: 1.1
              }}
            >
              entre para o grupo
            </span>
            <span
              style={{
                fontSize: 56,
                fontFamily: 'Fraunces',
                fontStyle: 'italic',
                color: SAGE,
                lineHeight: 1.1
              }}
            >
              {groupName}
            </span>
          </div>
        : <span
            style={{
              fontSize: 48,
              fontFamily: 'Fraunces',
              color: INK,
              lineHeight: 1.1
            }}
          >
            você recebeu um <span style={{ fontStyle: 'italic', color: SAGE }}>convite</span>
          </span>
        }

        {/* inviter line */}
        {isPending && inviterName && (
          <span
            style={{
              fontSize: 22,
              color: INK_SOFT,
              marginTop: 24
            }}
          >
            convidado por <span style={{ color: CLAY, fontFamily: 'Fraunces', fontStyle: 'italic', fontSize: 24 }}>{inviterName}</span>
          </span>
        )}

        {/* tagline */}
        <span
          style={{
            fontSize: 16,
            color: INK_SOFT,
            fontFamily: 'Fraunces',
            fontStyle: 'italic',
            marginTop: 32
          }}
        >
          o diário de aviões da gente.
        </span>
      </div>

      {/* right: illustration */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 360
        }}
      >
        <img
          alt=''
          src={illustrationSrc}
          width={320}
          height={320}
          style={{ objectFit: 'contain' }}
        />
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: 'Fraunces',
          data: fraunces,
          style: 'normal',
          weight: 400
        }
      ]
    }
  )
}
