import { auth } from '@/lib/auth'
import { getAuthClient } from '@/lib/googleCalendar'
import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import { getPreferences } from '@/lib/reminderEngine'

export async function GET(req: Request) {
  const session = await auth()
  const googleToken = (session as any)?.googleAccessToken

  if (!googleToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const authClient = getAuthClient(googleToken)
    const calendar = google.calendar({ version: 'v3', auth: authClient })

    // Calculate the start of the week (Monday) based on offset
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + (offset * 7))
    monday.setHours(0, 0, 0, 0)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: monday.toISOString(),
      timeMax: sunday.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    })

    const events = (res.data.items ?? []).map((e) => ({
      id: e.id,
      title: e.summary ?? 'Busy',
      start: e.start?.dateTime ?? e.start?.date ?? '',
      end: e.end?.dateTime ?? e.end?.date ?? '',
      isAllDay: !e.start?.dateTime,
      location: e.location ?? '',
      meetLink: e.conferenceData?.entryPoints?.[0]?.uri ?? '',
      colorId: e.colorId ?? '0',
      status: e.status ?? 'confirmed'
    }))

    // Fetch routine preferences
    const userId = session?.user?.email || 'default'
    const prefs = await getPreferences(userId)

    return NextResponse.json({ 
      events, 
      weekStart: monday.toISOString(),
      prefs: prefs || { wakeTime: '00:00', sleepTime: '23:59' }
    })
  } catch (error: any) {
    console.error('Failed to fetch week schedule:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
