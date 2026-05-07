import { auth } from '@/lib/auth'
import { markMultipleAsRead, getUnreadEmailIds } from '@/lib/gmail'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const googleToken = session.googleAccessToken
  if (!googleToken) {
    return NextResponse.json({ error: 'Google not connected' }, { status: 400 })
  }

  try {
    // 1. Fetch unread email IDs only (fast, up to 500)
    const ids = await getUnreadEmailIds(googleToken, 500)

    if (ids.length === 0) return NextResponse.json({ success: true, count: 0 })

    // 2. Mark them all as read in one batch
    const result = await markMultipleAsRead(googleToken, ids)
    if (!result.success) throw new Error(result.error)

    return NextResponse.json({ success: true, count: ids.length })
  } catch (err: any) {
    console.error('[EmailReadAll] Error:', err.message)
    return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 })
  }
}
