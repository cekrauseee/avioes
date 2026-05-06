import { NextRequest, NextResponse } from 'next/server'
import { expirePendingInvitations } from '../../../../lib/store'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const expired = await expirePendingInvitations()
  return NextResponse.json({ expired })
}
