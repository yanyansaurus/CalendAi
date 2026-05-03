import { auth } from '@/lib/auth'
import { getChatHistory, saveChatHistory, clearChatHistory } from '@/lib/reminderEngine'
import { NextResponse } from 'next/server'

// GET — load chat history for the signed-in user
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const messages = await getChatHistory(session.user.email)
  return NextResponse.json({ messages })
}

// PUT — save chat history for the signed-in user
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages } = await req.json()
  await saveChatHistory(session.user.email, messages)
  return NextResponse.json({ ok: true })
}

// DELETE — clear chat history
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await clearChatHistory(session.user.email)
  return NextResponse.json({ ok: true })
}
