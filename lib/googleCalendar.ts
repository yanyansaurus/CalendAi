import { google } from 'googleapis'
import type { BusySlot, FreeSlot } from '@/types'

// ─── Build an authenticated Google OAuth2 client from an access token ─────────
export function getAuthClient(accessToken: string) {
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
  timezone = 'UTC'
): Promise<BusySlot[]> {
  const auth = getAuthClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  let timeMin: string
  let timeMax: string

  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now)

  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  const dateStr = `${year}-${month}-${day}`

  if (range === 'today') {
    timeMin = new Date(`${dateStr}T00:00:00Z`).toISOString() // Baseline UTC
    timeMax = new Date(`${dateStr}T23:59:59Z`).toISOString()
  } else if (range === 'this_week') {
    const localToday = new Date(`${dateStr}T12:00:00`)
    const dayOfWeek = localToday.getDay()
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    const monday = new Date(localToday)
    monday.setDate(localToday.getDate() - diffToMonday)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const mParts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(monday)
    const sParts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(sunday)

    const mStr = `${mParts.find(p => p.type === 'year')?.value}-${mParts.find(p => p.type === 'month')?.value}-${mParts.find(p => p.type === 'day')?.value}`
    const sStr = `${sParts.find(p => p.type === 'year')?.value}-${sParts.find(p => p.type === 'month')?.value}-${sParts.find(p => p.type === 'day')?.value}`

    timeMin = new Date(`${mStr}T00:00:00Z`).toISOString()
    timeMax = new Date(`${sStr}T23:59:59Z`).toISOString()
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
    end: b.end ?? '',
  }))
}

export async function getDetailedEvents(
  accessToken: string,
  start: string,
  end: string,
  timezone = 'UTC',
  calendarId = 'primary'
): Promise<BusySlot[]> {
  const auth = getAuthClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin: start,
      timeMax: end,
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: timezone
    })

    const items = res.data.items ?? []
    return items.map(item => ({
      start: item.start?.dateTime || item.start?.date || '',
      end: item.end?.dateTime || item.end?.date || '',
      title: calendarId === 'primary' ? (item.summary || 'Busy') : `Conflict (${calendarId.split('@')[0]})`
    }))
  } catch (e) {
    // If we can't see their calendar, just return empty (fallback)
    console.warn(`Could not fetch calendar for ${calendarId}`, e)
    return []
  }
}

// ─── Compute free slots ≥ minMinutes within working hours ─────────────────────
export function computeFreeSlots(
  busySlots: BusySlot[],
  rangeStart: Date,
  rangeEnd: Date,
  minMinutes = 30,
  workStartStr = '00:00',
  workEndStr = '23:59'
): FreeSlot[] {
  const [wsH, wsM] = workStartStr.split(':').map(Number)
  const [weH, weM] = workEndStr.split(':').map(Number)

  const free: FreeSlot[] = []
  const current = new Date(rangeStart)

  const now = new Date()

  while (current <= rangeEnd) {
    const day = current.getDay()
    // ALLOW WEEKENDS - removed the day !== 0 && day !== 6 check

    const dayStart = new Date(current)
    dayStart.setHours(wsH, wsM, 0, 0)
    const dayEnd = new Date(current)
    dayEnd.setHours(weH, weM, 0, 0)

    const busyToday = busySlots
      .filter((b) => {
        const bs = new Date(b.start)
        const be = new Date(b.end)
        // Correct overlap check: intersection of [bs, be] and [dayStart, dayEnd]
        return bs < dayEnd && be > dayStart
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    // If today, don't suggest past times
    let cursor = dayStart
    if (dayStart.toDateString() === now.toDateString()) {
      if (now > cursor) cursor = now
    }

    for (const busy of busyToday) {
        const busyStart = new Date(busy.start)
        const busyEnd = new Date(busy.end)

        if (cursor < busyStart) {
          const durMs = busyStart.getTime() - cursor.getTime()
          const durMin = Math.floor(durMs / 60000)
          if (durMin >= minMinutes) {
            free.push({
              start: cursor.toISOString(),
              end: busyStart.toISOString(),
              durationMinutes: durMin,
              label: formatSlotLabel(cursor, busyStart),
            })
          }
        }
        if (busyEnd > cursor) cursor = busyEnd
      }

      if (cursor < dayEnd) {
        const durMin = Math.floor((dayEnd.getTime() - cursor.getTime()) / 60000)
        if (durMin >= minMinutes) {
          free.push({
            start: cursor.toISOString(),
            end: dayEnd.toISOString(),
            durationMinutes: durMin,
            label: formatSlotLabel(cursor, dayEnd),
          })
        }
      }

    current.setDate(current.getDate() + 1)
  }

  return free
}

function formatSlotLabel(start: Date, end: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
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
      summary: opts.title,
      description: opts.description,
      colorId: opts.colorId,
      start: { dateTime: opts.startTime },
      end: { dateTime: opts.endTime },
    },
  })

  return {
    eventId: event.data.id ?? '',
    htmlLink: event.data.htmlLink ?? '',
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
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: opts.title,
      start: { dateTime: opts.startTime },
      end: { dateTime: endTime },
      attendees: (opts.attendees ?? []).map((e) => ({ email: e })),
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
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

  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 0)

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: monday.toISOString(),
    timeMax: sunday.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  })

  return (res.data.items ?? []).map((e) => ({
    id: e.id,
    title: e.summary ?? 'Untitled',
    start: e.start?.dateTime ?? e.start?.date ?? '',
    end: e.end?.dateTime ?? e.end?.date ?? '',
    durationMinutes: Math.round(
      (new Date(e.end?.dateTime ?? e.end?.date ?? '').getTime() -
        new Date(e.start?.dateTime ?? e.start?.date ?? '').getTime()) / 60000,
    ),
  }))
}

// ─── Fetch today's detailed events for AI context ─────────────────────────────
export async function getTodayEvents(accessToken: string, timezone = 'UTC') {
  const auth = getAuthClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now)

  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  const dateStr = `${year}-${month}-${day}`

  // WIDER WINDOW: Fetch 24 hours before and after to handle all timezones
  const dayStart = new Date(`${dateStr}T00:00:00Z`)
  const timeMin = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(dayStart.getTime() + 48 * 60 * 60 * 1000).toISOString()

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  })

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  // PRECISE FILTER: Convert each event's start time to the user's timezone and check the date
  return (res.data.items ?? [])
    .map((e) => ({
      title: e.summary ?? 'Busy',
      description: e.description ?? '',
      start: e.start?.dateTime ?? e.start?.date ?? '',
      end: e.end?.dateTime ?? e.end?.date ?? '',
    }))
    .filter(e => {
      try {
        const eventDate = new Date(e.start)
        const eParts = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).formatToParts(eventDate)

        const eYear = eParts.find(p => p.type === 'year')?.value
        const eMonth = eParts.find(p => p.type === 'month')?.value
        const eDay = eParts.find(p => p.type === 'day')?.value
        const eDateStr = `${eYear}-${eMonth}-${eDay}`

        return eDateStr === dateStr
      } catch {
        return e.start.startsWith(dateStr)
      }
    })
}

// ─── Update an existing calendar event ────────────────────────────────────────
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  opts: {
    title?: string
    startTime?: string
    endTime?: string
    description?: string
  },
) {
  const auth = getAuthClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const requestBody: any = {}
  if (opts.title) requestBody.summary = opts.title
  if (opts.description) requestBody.description = opts.description
  if (opts.startTime) requestBody.start = { dateTime: opts.startTime }
  if (opts.endTime) requestBody.end = { dateTime: opts.endTime }

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody,
  })
}

// ─── Delete an existing calendar event ────────────────────────────────────────
export async function deleteCalendarEvent(accessToken: string, eventId: string) {
  const auth = getAuthClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  })
}
export async function createGoogleTask(accessToken: string, task: { title: string, notes?: string, due?: string }) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const tasks = google.tasks({ version: 'v1', auth })

  const res = await tasks.tasks.insert({
    tasklist: '@default',
    requestBody: {
      title: task.title,
      notes: task.notes,
      due: task.due ? new Date(task.due).toISOString() : undefined,
    }
  })
  return res.data
}
