import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.googleAccessToken) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const offsetWeeks = parseInt(searchParams.get('offset') ?? '0', 10)

    const auth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    )
    auth2.setCredentials({ access_token: session.googleAccessToken })
    const calendar = google.calendar({ version: 'v3', auth: auth2 })

    // Calculate the Monday–Sunday range for the requested week
    const now    = new Date()
    const day    = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + (offsetWeeks * 7))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const res = await calendar.events.list({
      calendarId:  'primary',
      timeMin:     monday.toISOString(),
      timeMax:     sunday.toISOString(),
      singleEvents: true,
      orderBy:     'startTime',
      maxResults:  200,
    })

    const events = (res.data.items ?? []).map((e) => {
      const isAllDay = !e.start?.dateTime
      return {
        id:        e.id ?? '',
        title:     e.summary ?? 'Untitled',
        start:     e.start?.dateTime ?? e.start?.date ?? '',
        end:       e.end?.dateTime ?? e.end?.date ?? '',
        isAllDay,
        location:  e.location ?? '',
        meetLink:  e.conferenceData?.entryPoints?.[0]?.uri ?? '',
        colorId:   e.colorId ?? '0',
        status:    e.status ?? 'confirmed',
      }
    })

    return NextResponse.json({
      events,
      weekStart: monday.toISOString(),
      weekEnd:   sunday.toISOString(),
    })
  } catch (err: any) {
    console.error('Week schedule error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to load schedule' },
      { status: 500 }
    )
  }
}
