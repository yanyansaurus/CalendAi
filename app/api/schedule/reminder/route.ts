import { auth } from '@/lib/auth'
import { getDueReminders } from '@/lib/reminderEngine'
import { NextResponse } from 'next/server'

// Polled every 60 seconds by the frontend
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reminders = await getDueReminders(session.user.email)
  return NextResponse.json({ reminders })
}
