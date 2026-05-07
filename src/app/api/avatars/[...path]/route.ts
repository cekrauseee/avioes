import { getCurrentUser } from '@/lib/auth-guards'
import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'

const PATH_RE = /^profile\/[a-zA-Z0-9_-]+\/[A-Za-z0-9._-]+$/

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const user = await getCurrentUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { path } = await ctx.params
  const pathname = path.map((segment) => decodeURIComponent(segment)).join('/')
  if (!PATH_RE.test(pathname)) return new NextResponse('Not found', { status: 404 })

  let result
  try {
    result = await get(pathname, { access: 'private' })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
  if (!result || result.statusCode !== 200) return new NextResponse('Not found', { status: 404 })

  return new NextResponse(result.stream, {
    status: 200,
    headers: {
      'Content-Type': result.blob.contentType,
      'Content-Length': String(result.blob.size),
      'Cache-Control': 'private, max-age=31536000, immutable'
    }
  })
}
