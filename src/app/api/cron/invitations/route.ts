import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { expirePendingInvitations } from '../../../../lib/store'

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || !auth || !timingSafeCompare(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const expired = await expirePendingInvitations()
  return NextResponse.json({ expired })
}
