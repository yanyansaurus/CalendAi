import { google } from 'googleapis'
import type { BusySlot, FreeSlot } from '@/types'

// ─── Build an authenticated Google OAuth2 client from an access token ─────────
function getAuthClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  auth.setCredentials({ access_token: accessToken })
  return auth
}

// ─── Get busy slots for a time range ─────────────────────────────────────────
export async function getFreeBusy(
  accessToken: string,
  range: 'today' | 'this_week' | { start: string; end: string },
): Promise<BusySlot[]> {
  const auth = getAuthClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  let timeMin: string
  let timeMax: string

  if (range === 'today') {
    const now = new Date()
    timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString()
    timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
  } else if (range === 'this_week') {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)
    friday.setHours(23, 59, 59, 0)
    timeMin = monday.toISOString()
    timeMax = friday.toISOString()
  } else {
    timeMin = range.start
    timeMax = range.end
  }

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: 'primary' }],
    },
  })

  const busy = res.data.calendars?.primary?.busy ?? []
  return busy.map((b) => ({
    start: b.start ?? '',
    end:   b.end   ?? '',
  }))
}

// ─── Compute free slots ≥ minMinutes within working hours ─────────────────────
export function computeFreeSlots(
  busySlots: BusySlot[],
  rangeStart: Date,
  rangeEnd: Date,
  minMinutes = 30,
): FreeSlot[] {
  const workStart = 9  // 9 AM
  const workEnd   = 18 // 6 PM

  const free: FreeSlot[] = []
  const current = new Date(rangeStart)

  while (current <= rangeEnd) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) { // Skip weekends
      const dayStart = new Date(current)
      dayStart.setHours(workStart, 0, 0, 0)
      const dayEnd = new Date(current)
      dayEnd.setHours(workEnd, 0, 0, 0)

      const busyToday = busySlots
        .filter((b) => {
          const bs = new Date(b.start)
          return bs >= dayStart && bs <= dayEnd
        })
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

      let cursor = dayStart

      for (const busy of busyToday) {
        const busyStart = new Date(busy.start)
        const busyEnd   = new Date(busy.end)

        if (cursor < busyStart) {
          const durMs  = busyStart.getTime() - cursor.getTime()
          const durMin = Math.floor(durMs / 60000)
          if (durMin >= minMinutes) {
            free.push({
              start:           cursor.toISOString(),
              end:             busyStart.toISOString(),
              durationMinutes: durMin,
              label:           formatSlotLabel(cursor, busyStart),
            })
          }
        }
        if (busyEnd > cursor) cursor = busyEnd
      }

      if (cursor < dayEnd) {
        const durMin = Math.floor((dayEnd.getTime() - cursor.getTime()) / 60000)
        if (durMin >= minMinutes) {
          free.push({
            start:           cursor.toISOString(),
            end:             dayEnd.toISOString(),
            durationMinutes: durMin,
            label:           formatSlotLabel(cursor, dayEnd),
          })
        }
      }
    }
    current.setDate(current.getDate() + 1)
  }

  return free
}

function formatSlotLabel(start: Date, end: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${days[start.getDay()]} ${fmt(start)}–${fmt(end)}`
}

// ─── Create a calendar event (plain block, no Meet link) ──────────────────────
export async function createCalendarEvent(
  accessToken: string,
  opts: {
    title: string
    startTime: string
    endTime: string
    description?: string
    colorId?: string // '1'=lavender … '11'=tomato
  },
): Promise<{ eventId: string; htmlLink: string }> {
  const auth = getAuthClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary:     opts.title,
      description: opts.description,
      colorId:     opts.colorId,
      start: { dateTime: opts.startTime },
      end:   { dateTime: opts.endTime   },
    },
  })

  return {
    eventId:  event.data.id        ?? '',
    htmlLink: event.data.htmlLink  ?? '',
  }
}

// ─── Create a Google Meet event ───────────────────────────────────────────────
export async function createGoogleMeet(
  accessToken: string,
  opts: {
    title: string
    startTime: string
    durationMinutes: number
    attendees?: string[]
  },
): Promise<{ meetLink: string; eventId: string }> {
  const auth = getAuthClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const endTime = new Date(
    new Date(opts.startTime).getTime() + opts.durationMinutes * 60000,
  ).toISOString()

  const event = await calendar.events.insert({
    calendarId:            'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary:   opts.title,
      start:     { dateTime: opts.startTime },
      end:       { dateTime: endTime },
      attendees: (opts.attendees ?? []).map((e) => ({ email: e })),
      conferenceData: {
        createRequest: {
          requestId:             crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  })

  const meetLink =
    event.data.conferenceData?.entryPoints?.[0]?.uri ?? ''

  return { meetLink, eventId: event.data.id ?? '' }
}

// ─── Fetch this week's events for time analysis ───────────────────────────────
export async function getWeekEvents(accessToken: string) {
  const auth = getAuthClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const now    = new Date()
  const day    = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 0)

  const res = await calendar.events.list({
    calendarId:   'primary',
    timeMin:       monday.toISOString(),
    timeMax:       sunday.toISOString(),
    singleEvents:  true,
    orderBy:      'startTime',
    maxResults:    100,
  })

  return (res.data.items ?? []).map((e) => ({
    title:     e.summary ?? 'Untitled',
    start:     e.start?.dateTime ?? e.start?.date ?? '',
    end:       e.end?.dateTime   ?? e.end?.date   ?? '',
    durationMinutes: Math.round(
      (new Date(e.end?.dateTime ?? e.end?.date ?? '').getTime() -
       new Date(e.start?.dateTime ?? e.start?.date ?? '').getTime()) / 60000,
    ),
  }))
}
