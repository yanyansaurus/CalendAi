import { auth } from '@/lib/auth'
import { getAuthClient } from '@/lib/googleCalendar'
import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  const googleToken = (session as any)?.googleAccessToken
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') || 'Today'
  const timezone = searchParams.get('timezone') || 'UTC'

  if (!googleToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const authClient = getAuthClient(googleToken)
    const calendar = google.calendar({ version: 'v3', auth: authClient })

    const now = new Date()
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    
    let timeMin = new Date(userNow)
    let timeMax = new Date(userNow)

    if (scope === 'Today') {
      timeMin.setHours(0, 0, 0, 0)
      timeMax.setHours(23, 59, 59, 999)
    } else if (scope === 'Tomorrow') {
      timeMin.setDate(userNow.getDate() + 1)
      timeMin.setHours(0, 0, 0, 0)
      timeMax.setDate(userNow.getDate() + 1)
      timeMax.setHours(23, 59, 59, 999)
    } else if (scope === 'Next 3 Days') {
      timeMin.setHours(0, 0, 0, 0)
      timeMax.setDate(userNow.getDate() + 2)
      timeMax.setHours(23, 59, 59, 999)
    } else if (scope === 'Weekend') {
      const day = userNow.getDay()
      const diff = (day === 0 ? -1 : 6 - day)
      timeMin.setDate(userNow.getDate() + diff)
      timeMin.setHours(0, 0, 0, 0)
      timeMax.setDate(userNow.getDate() + diff + 1)
      timeMax.setHours(23, 59, 59, 999)
    } else {
      timeMin.setHours(0, 0, 0, 0)
      timeMax.setDate(userNow.getDate() + 6)
      timeMax.setHours(23, 59, 59, 999)
    }

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = (response.data.items || []).map(item => {
      const start = item.start?.dateTime || item.start?.date || ''
      const end = item.end?.dateTime || item.end?.date || ''
      const startTime = start.includes('T') ? start.split('T')[1].substring(0, 5) : '09:00'
      const endTime = end.includes('T') ? end.split('T')[1].substring(0, 5) : '10:00'

      return {
        id: item.id,
        name: item.summary || 'Untitled Event',
        startTime,
        endTime,
        type: 'Existing',
        colorId: item.colorId || '9'
      }
    }).filter(e => !e.name.includes('Wake Up') && !e.name.includes('Sleep'))

    return NextResponse.json({ events })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  const googleToken = (session as any)?.googleAccessToken

  if (!googleToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { routines, timezone } = await req.json()
    const authClient = getAuthClient(googleToken)
    const calendar = google.calendar({ version: 'v3', auth: authClient })

    let createdCount = 0
    
    // Process each routine in the batch
    for (const routine of routines) {
      if (!routine) continue; // Safety check
      const { date, wakeTime, sleepTime, activities } = routine
      const dateStr = date // "YYYY-MM-DD"
      
      // 1. CLEANUP: Remove any existing "Architected" events for this specific day to allow clean overwriting
      const existing = await calendar.events.list({
        calendarId: 'primary',
        timeMin: `${dateStr}T00:00:00Z`,
        timeMax: `${dateStr}T23:59:59Z`,
        q: 'Architected by ExecutiveVAi'
      })

      if (existing.data.items) {
        for (const item of existing.data.items) {
          if (item.id) await calendar.events.delete({ calendarId: 'primary', eventId: item.id })
        }
      }
      
      const insert = async (summary: string, start: string, end: string, color: string) => {
        await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary,
            start: { dateTime: `${dateStr}T${start}:00`, timeZone: timezone },
            end: { dateTime: `${dateStr}T${end}:00`, timeZone: timezone },
            description: 'Architected by ExecutiveVAi Routine Wizard',
            colorId: color
          }
        })
        createdCount++
      }

      // 2. BATCH INSERT: Add the new daily flow
      await insert('🌅 Wake Up', wakeTime, minToTime(timeToMin(wakeTime) + 15), '5')
      for (const act of activities) {
        if (!act.name) continue
        await insert(act.name, act.startTime, act.endTime, act.colorId || '9')
      }
      await insert('🌙 Sleep', sleepTime, '23:59', '3')
    }

    return NextResponse.json({ success: true, count: createdCount, days: routines.length })
  } catch (error: any) {
    console.error('Batch sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function timeToMin(t: string) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTime(min: number) {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}
