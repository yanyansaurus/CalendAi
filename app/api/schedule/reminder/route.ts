import { auth } from '@/lib/auth'
import { getDueReminders } from '@/lib/reminderEngine'
import { saveGoogleToken } from '@/lib/redisTokens'
import { NextResponse } from 'next/server'

// Polled every 60 seconds by the frontend
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session?.user?.email && (session as any).googleAccessToken) {
    saveGoogleToken(session.user.email, (session as any).googleAccessToken).catch(() => {})
  }

  const reminders = await getDueReminders(session.user.email)
  
  return NextResponse.json({ reminders, emailSuggestions: [] })
}
