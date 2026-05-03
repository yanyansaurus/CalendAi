import { auth } from '@/lib/auth'
import { getGeminiModel, SYSTEM_PROMPT } from '@/lib/gemini'
import { parseIntent } from '@/lib/intentParser'
import { getFreeBusy, createGoogleMeet, createCalendarEvent } from '@/lib/googleCalendar'
import { createZoomMeeting } from '@/lib/zoom'
import { getSchedule, saveSchedule, scheduleRemindersForPlan } from '@/lib/reminderEngine'
import { colorIdForType } from '@/lib/intentParser'
import type { ScheduleTask, MeetingResult, FreeSlot } from '@/types'
import { computeFreeSlots } from '@/lib/googleCalendar'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message, history = [] } = await req.json()
  const userId         = session.user.email
  const googleToken    = session.googleAccessToken
  const zoomToken      = session.zoomAccessToken
  const timezone       = req.headers.get('x-timezone') ?? 'UTC'

  // ── Build dynamic context ──────────────────────────────────────────────────
  let busySlots: Array<{ start: string; end: string }> = []
  if (googleToken) {
    try { busySlots = await getFreeBusy(googleToken, 'today') } catch { /* ignore */ }
  }
  const todaySchedule = await getSchedule(userId)

  const systemPrompt = SYSTEM_PROMPT
    .replace('{currentTime}',    new Date().toISOString())
    .replace('{userTimezone}',   timezone)
    .replace('{busySlots}',      JSON.stringify(busySlots))
    .replace('{todaySchedule}',  JSON.stringify(todaySchedule))

  // ── Call Gemini ────────────────────────────────────────────────────────────
  const model = getGeminiModel()
  const chat  = model.startChat({
    systemInstruction: systemPrompt,
    history: history.map((m: { role: string; content: string }) => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  })

  const result      = await chat.sendMessage(message)
  const rawResponse = result.response.text()

  const parsed = parseIntent(rawResponse)

  // ── Plain chat reply, no action needed ────────────────────────────────────
  if (parsed.isChat) {
    return NextResponse.json({ type: 'chat', text: parsed.chatText })
  }

  const action = parsed.action!

  // ── Execute the intent ────────────────────────────────────────────────────
  switch (action.intent) {

    // ── Create a meeting ──────────────────────────────────────────────────
    case 'create_meeting': {
      const startTime = action.startTime ?? new Date(Date.now() + 5 * 60000).toISOString()
      const duration  = action.duration  ?? 30
      const title     = action.title     ?? 'Meeting'
      let meetingResult: MeetingResult | null = null

      if (action.platform === 'zoom' && zoomToken) {
        const zoom = await createZoomMeeting(zoomToken, {
          title,
          startTime,
          durationMinutes: duration,
          timezone,
        })
        meetingResult = {
          platform:  'zoom',
          title,
          startTime,
          duration,
          zoomLink:  zoom.joinUrl,
          joinUrl:   zoom.joinUrl,
        }
        // Also block on Google Calendar if available
        if (googleToken) {
          const end = new Date(new Date(startTime).getTime() + duration * 60000).toISOString()
          await createCalendarEvent(googleToken, { title, startTime, endTime: end, colorId: '2' })
        }
      } else if (googleToken) {
        const meet = await createGoogleMeet(googleToken, {
          title,
          startTime,
          durationMinutes: duration,
          attendees: action.attendees,
        })
        meetingResult = {
          platform: 'google_meet',
          title,
          startTime,
          duration,
          meetLink: meet.meetLink,
          eventId:  meet.eventId,
        }
      }

      return NextResponse.json({
        type:          'meeting',
        text:          action.naturalResponse,
        action,
        meetingResult,
      })
    }

    // ── Find free slots ───────────────────────────────────────────────────
    case 'find_slots': {
      if (!googleToken) {
        return NextResponse.json({ type: 'chat', text: 'Please connect your Google Calendar first.' })
      }
      const allBusy = await getFreeBusy(googleToken, 'this_week')
      const now     = new Date()
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() + (5 - now.getDay()))
      const slots: FreeSlot[] = computeFreeSlots(allBusy, now, weekEnd, action.duration ?? 60)
        .slice(0, 3)

      return NextResponse.json({
        type:      'slots',
        text:      action.naturalResponse,
        action,
        freeSlots: slots,
      })
    }

    // ── Morning intake — parse task dump & schedule the day ───────────────
    case 'morning_intake': {
      if (!googleToken || !action.tasks?.length) {
        return NextResponse.json({ type: 'chat', text: action.naturalResponse })
      }

      const todayBusy = await getFreeBusy(googleToken, 'today')
      const todayFree = computeFreeSlots(todayBusy, new Date(), (() => {
        const d = new Date(); d.setHours(20, 0, 0, 0); return d
      })(), 15)

      // Assign times to tasks from free slots
      const scheduled: ScheduleTask[] = []
      let freeIdx = 0

      for (const task of (action.tasks ?? [])) {
        if (freeIdx >= todayFree.length) break
        const slot = todayFree[freeIdx]
        const start = slot.start
        const end   = new Date(
          new Date(start).getTime() + task.estimatedMinutes * 60000,
        ).toISOString()

        // Consume this slot (advance pointer past the task end)
        while (freeIdx < todayFree.length && new Date(todayFree[freeIdx].start) < new Date(end)) {
          freeIdx++
        }

        const colorId = colorIdForType(task.type)
        let eventId   = ''
        try {
          const ev = await createCalendarEvent(googleToken, {
            title:     task.name,
            startTime: start,
            endTime:   end,
            colorId,
          })
          eventId = ev.eventId
        } catch { /* log but continue */ }

        scheduled.push({ ...task, startTime: start, endTime: end, eventId })
      }

      await saveSchedule(userId, scheduled)
      await scheduleRemindersForPlan(userId, scheduled)

      return NextResponse.json({
        type:     'schedule',
        text:     action.naturalResponse,
        action,
        schedule: scheduled,
      })
    }

    // ── Daily briefing ────────────────────────────────────────────────────
    case 'daily_briefing':
    case 'list_today': {
      const plan = await getSchedule(userId)
      return NextResponse.json({
        type:     'schedule',
        text:     action.naturalResponse,
        action,
        schedule: plan,
      })
    }

    // ── Clarification needed ──────────────────────────────────────────────
    case 'clarify':
      return NextResponse.json({
        type: 'chat',
        text: action.clarifyQuestion ?? action.naturalResponse,
      })

    // ── All other intents — return natural response ───────────────────────
    default:
      return NextResponse.json({ type: 'chat', text: action.naturalResponse, action })
  }
}
