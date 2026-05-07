import { auth } from '@/lib/auth'
import { markEmailAsRead } from '@/lib/gmail'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const googleToken = session.googleAccessToken
  if (!googleToken) {
    return NextResponse.json({ error: 'Google not connected' }, { status: 400 })
  }

  try {
    const { messageId } = await req.json()
    if (!messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 })

    const result = await markEmailAsRead(googleToken, messageId)
    if (!result.success) {
      throw new Error(result.error)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[EmailDismiss] Error:', err.message)
    return NextResponse.json({ error: 'Failed to mark email as read' }, { status: 500 })
  }
}
