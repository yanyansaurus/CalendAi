import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { google } from 'googleapis'
import { logAudit } from '@/lib/audit'

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.googleAccessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
  }

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ access_token: session.googleAccessToken as string })
    const calendar = google.calendar({ version: 'v3', auth })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    })

    await logAudit({
      userId: session.user?.email || 'unknown',
      action: 'meeting_canceled',
      status: 'success',
      details: { eventId },
      metadata: { userAgent: req.headers.get('user-agent') || '' }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting event:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
