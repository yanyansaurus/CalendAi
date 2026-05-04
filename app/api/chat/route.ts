import { auth } from '@/lib/auth'
import { getGeminiModel, getFallbackGeminiModel, SYSTEM_PROMPT } from '@/lib/gemini'
import { parseIntent } from '@/lib/intentParser'
import { getFreeBusy, createGoogleMeet, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/googleCalendar'
import { getUnreadEmails, sendEmail } from '@/lib/gmail'
import { createZoomMeeting, getZoomAccessToken, isZoomConfigured } from '@/lib/zoom'
import { getSchedule, saveSchedule, scheduleRemindersForPlan } from '@/lib/reminderEngine'
import { getBudgetData, addExpense } from '@/lib/budgetEngine'
import { colorIdForType } from '@/lib/intentParser'
import type { ScheduleTask, MeetingResult, FreeSlot } from '@/types'
import { computeFreeSlots } from '@/lib/googleCalendar'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message, history = [], imageBase64 } = await req.json()
  const userId         = session.user.email
  const googleToken    = session.googleAccessToken
  const zoomConfigured = isZoomConfigured()
  const timezone       = req.headers.get('x-timezone') ?? 'UTC'

  let busySlots: Array<{ start: string; end: string }> = []
  if (googleToken) {
    try { busySlots = await getFreeBusy(googleToken, 'today') } catch { /* ignore */ }
  }
  const todaySchedule = await getSchedule(userId)

  // ── Format context to prevent AI timezone hallucinations ───────────────────
  const localTime = new Date().toLocaleString('en-US', { timeZone: timezone })
  const formattedBusySlots = busySlots.map(slot => ({
    start: new Date(slot.start).toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true }),
    end: new Date(slot.end).toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true })
  }))

  const systemPrompt = SYSTEM_PROMPT
    .replace('{currentTime}',    localTime)
    .replace('{userTimezone}',   timezone)
    .replace('{busySlots}',      JSON.stringify(formattedBusySlots))
    .replace('{todaySchedule}',  JSON.stringify(todaySchedule))

  // ── Call Gemini ────────────────────────────────────────────────────────────
  const model = getGeminiModel(systemPrompt)
  
  // Transform history and ensure it's valid for Google SDK
  let formattedHistory = (history || []).map((m: { role: string; content: string }) => ({
    role:  (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user',
    parts: [{ text: m.content || '' }],
  }))

  // 1. Must start with 'user'
  while (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
    formattedHistory.shift()
  }

  // 2. No consecutive roles (merge them)
  const cleanedHistory: any[] = []
  for (const msg of formattedHistory) {
    if (cleanedHistory.length > 0 && cleanedHistory[cleanedHistory.length - 1].role === msg.role) {
      cleanedHistory[cleanedHistory.length - 1].parts[0].text += '\n' + msg.parts[0].text
    } else {
      cleanedHistory.push(msg)
    }
  }

  const chat = model.startChat({
    history: cleanedHistory,
  })

  let rawResponse: string
  try {
    let sendPayload: any = message
    if (imageBase64) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/)
      if (match) {
        sendPayload = [
          { text: message },
          { inlineData: { mimeType: match[1], data: match[2] } }
        ]
      }
    }
    const result = await chat.sendMessage(sendPayload)
    rawResponse  = result.response.text()
  } catch (err: any) {
    console.error('Primary model error:', err.status, err.message)
    // ── Auto-fallback to secondary model ──
    try {
      console.log('[ExecutiveVAi] Retrying with fallback model...')
      const fallbackModel = getFallbackGeminiModel(systemPrompt)
      const fallbackChat = fallbackModel.startChat({ history: cleanedHistory })
      
      let sendPayload: any = message
      if (imageBase64) {
        const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/)
        if (match) {
          sendPayload = [
            { text: message },
            { inlineData: { mimeType: match[1], data: match[2] } }
          ]
        }
      }
      const fallbackResult = await fallbackChat.sendMessage(sendPayload)
      rawResponse = fallbackResult.response.text()
    } catch (fallbackErr: any) {
      if (fallbackErr.status === 429) {
        const retryMatch = fallbackErr.message?.match(/retry in ([\d.]+)s/i)
        const retrySec   = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30
        return NextResponse.json({
          type: 'chat',
          text: `⏳ I'm being rate-limited by the AI service. Please wait ~${retrySec} seconds and try again.`,
        })
      }
      console.error('Fallback model error:', fallbackErr)
      return NextResponse.json({
        type: 'chat',
        text: '⚠️ Something went wrong with the AI service. Please try again in a moment.',
      })
    }
  }

  const parsed = parseIntent(rawResponse)

  // ── Safety Override ───────────────────────────────────────────────────────
  // If the AI stubbornyl chooses send_email despite being told to draft it, we intercept it.
  if (!parsed.isChat && parsed.action?.intent === 'send_email') {
    const msgLower = message.toLowerCase()
    if (msgLower.includes('just draft it') || msgLower.includes('do not send') || msgLower.includes('draft a')) {
      parsed.action.intent = 'draft_email'
    }
  }

  // ── Plain chat reply, no action needed ────────────────────────────────────
  if (parsed.isChat) {
    return NextResponse.json({ type: 'chat', text: parsed.chatText })
  }

  const action = parsed.action!

  // ── Execute the intent ────────────────────────────────────────────────────
  try {
    switch (action.intent) {

    // ── Create a meeting ──────────────────────────────────────────────────
    case 'create_meeting': {
      let startTime = new Date(Date.now() + 5 * 60000).toISOString()
      if (action.startTime) {
        // Ensure AI's floating timestamp is converted to a proper UTC ISO string based on server timezone
        startTime = new Date(action.startTime).toISOString()
      }
      const duration  = action.duration  ?? 30
      const title     = action.title     ?? 'Meeting'
      let meetingResult: MeetingResult | null = null

      if (action.platform === 'zoom' && zoomConfigured) {
        const zoomToken = await getZoomAccessToken()
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
          agenda:    action.agenda,
          zoomLink:  zoom.joinUrl,
          joinUrl:   zoom.joinUrl,
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
          agenda:   action.agenda,
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

    // ── Create a plain calendar event ─────────────────────────────────────
    case 'create_event': {
      if (!googleToken) {
        return NextResponse.json({ type: 'chat', text: '⚠️ Google Calendar is not connected. Please sign out and sign back in to reconnect.' })
      }

      let startTime = new Date(Date.now() + 5 * 60000).toISOString()
      if (action.startTime) {
        startTime = new Date(action.startTime).toISOString()
      }
      const duration  = action.duration  ?? 60
      const title     = action.title     ?? 'Event'
      const endTime   = new Date(new Date(startTime).getTime() + duration * 60000).toISOString()

      // Pick a color based on the event type if tasks are provided
      const taskType = action.tasks?.[0]?.type
      const colorId  = taskType ? colorIdForType(taskType) : '9' // default to blueberry

      console.log(`[ExecutiveVAi] Creating event: "${title}" | ${startTime} → ${endTime} | Token: ${googleToken ? 'present' : 'MISSING'}`)

      try {
        const ev = await createCalendarEvent(googleToken, {
          title,
          startTime,
          endTime,
          colorId,
        })

        console.log(`[ExecutiveVAi] Event created successfully: ${ev.eventId}`)

        return NextResponse.json({
          type:   'chat',
          text:   action.naturalResponse ?? `✅ Done! I've added "${title}" to your calendar.`,
          action: { ...action, eventId: ev.eventId },
        })
      } catch (err: any) {
        console.error('[ExecutiveVAi] Create event error:', err.status, err.message, err.errors)
        
        // If it's a 401, the token expired and refresh failed
        if (err.code === 401 || err.status === 401) {
          return NextResponse.json({
            type: 'chat',
            text: '⚠️ Your Google session has expired. Please **sign out and sign back in** to refresh your connection.',
          })
        }

        return NextResponse.json({
          type: 'chat',
          text: `⚠️ Failed to create the event: ${err.message ?? 'Unknown error'}`,
        })
      }
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
      const budget = await getBudgetData(userId)
      return NextResponse.json({
        type:     'schedule',
        text:     action.naturalResponse,
        action,
        schedule: plan,
        budgetResult: budget
      })
    }

    // ── Reschedule a meeting ──────────────────────────────────────────────
    case 'reschedule': {
      if (!googleToken) return NextResponse.json({ type: 'chat', text: 'Google Calendar not connected.' })
      const title = action.title?.toLowerCase()
      const task = todaySchedule.find(t => t.name.toLowerCase().includes(title ?? ''))
      
      if (!task?.eventId) {
        return NextResponse.json({ type: 'chat', text: `I couldn't find a meeting named "${action.title}" to reschedule.` })
      }

      const duration = action.duration ?? task.estimatedMinutes
      const end = new Date(new Date(action.startTime!).getTime() + duration * 60000).toISOString()
      
      await updateCalendarEvent(googleToken, task.eventId, {
        startTime: action.startTime!,
        endTime: end
      })

      return NextResponse.json({
        type: 'chat',
        text: action.naturalResponse ?? `OK, I've moved your meeting to ${new Date(action.startTime!).toLocaleTimeString()}.`,
        action
      })
    }

    // ── Cancel a meeting ──────────────────────────────────────────────────
    case 'cancel': {
      if (!googleToken) return NextResponse.json({ type: 'chat', text: 'Google Calendar not connected.' })
      const title = action.title?.toLowerCase()
      const task = todaySchedule.find(t => t.name.toLowerCase().includes(title ?? ''))
      
      if (!task?.eventId) {
        return NextResponse.json({ type: 'chat', text: `I couldn't find a meeting named "${action.title}" to cancel.` })
      }

      await deleteCalendarEvent(googleToken, task.eventId)
      
      return NextResponse.json({
        type: 'chat',
        text: action.naturalResponse ?? `Done. I've cancelled "${task.name}".`,
        action
      })
    }

    // ── Time Analysis ─────────────────────────────────────────────────────
    case 'time_analysis': {
      // We'll just return a chat response for now, but we could trigger the UI tab switch in the future
      return NextResponse.json({
        type: 'chat',
        text: action.naturalResponse ?? "I've analyzed your week. You can see the full breakdown in the Time Analysis tab!",
        action
      })
    }

    // ── Budget & Expenses ─────────────────────────────────────────────────
    case 'add_expense': {
      if (!action.expenseAmount) {
        return NextResponse.json({ type: 'chat', text: "How much was the expense?" })
      }
      const data = await addExpense(userId, {
        amount: action.expenseAmount,
        category: action.expenseCategory ?? 'Other',
        description: action.title ?? 'Expense',
        type: 'expense',
      })
      
      const totalSpent = data.expenses.filter(e => e.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0)
      const remaining = data.monthlyLimit - totalSpent

      return NextResponse.json({
        type: 'chat',
        text: action.naturalResponse ?? `Logged $${action.expenseAmount} for ${action.expenseCategory ?? 'Other'}. You have $${remaining} left for the month.`,
        action,
        budgetResult: { ...data, newExpenseAdded: true }
      })
    }

    case 'view_budget': {
      const data = await getBudgetData(userId)
      const totalSpent = data.expenses.filter(e => (e.type || 'expense') === 'expense').reduce((acc, curr) => acc + curr.amount, 0)
      const remaining = data.monthlyLimit - totalSpent

      return NextResponse.json({
        type: 'chat',
        text: action.naturalResponse ?? `You've spent $${totalSpent} out of your $${data.monthlyLimit} budget. You have $${remaining} remaining.`,
        action,
        budgetResult: data
      })
    }

    // ── Emails ────────────────────────────────────────────────────────────
    case 'read_emails': {
      if (!googleToken) {
        return NextResponse.json({ type: 'chat', text: 'Please connect your Google account to read emails.' })
      }
      const emails = await getUnreadEmails(googleToken, 5)
      
      if (emails.length === 0) {
        return NextResponse.json({
          type: 'chat',
          text: "📭 You have no new unread emails in your Primary inbox.",
          emails: []
        })
      }

      // Feed emails back to the AI for intelligent analysis
      const emailAnalysisPrompt = `You just fetched ${emails.length} unread emails for the user. Analyze them and give a smart summary.

Here are the emails:
${emails.map((e, i) => `${i + 1}. FROM: ${e.from} | SUBJECT: ${e.subject} | BODY: ${e.body?.substring(0, 300)}`).join('\n')}

IMPORTANT RULES:
- If any email is about scheduling a meeting, call, or appointment → mention it clearly and say "Would you like me to schedule this?"
- If any email has a deadline or due date → highlight it
- If any email needs a reply → say so
- Be concise, use bullet points
- Start your response with a brief overview like "You have X unread emails. Here's what needs your attention:"

Respond with ONLY a CHAT: message. Example:
CHAT: You have 3 unread emails. Here's what needs attention:

📌 **Meeting request** from John — wants to schedule a call for Friday. Want me to set it up?
📧 **Project update** from Sarah — FYI, no action needed.
⏰ **Deadline reminder** from Prof. Garcia — Assignment due May 5th.`

      try {
        const analysisResult = await chat.sendMessage(emailAnalysisPrompt)
        let analysisText = analysisResult.response.text().trim()
        // Strip CHAT: prefix if present
        if (analysisText.startsWith('CHAT:')) {
          analysisText = analysisText.substring(5).trim()
        }

        return NextResponse.json({
          type: 'chat',
          text: analysisText,
          action,
          emails
        })
      } catch {
        // Fallback to basic summary if AI analysis fails
        return NextResponse.json({
          type: 'chat',
          text: `📧 You have ${emails.length} unread emails. Check them below:`,
          action,
          emails
        })
      }
    }

    case 'draft_email': {
      if (!action.emailTo || !action.emailSubject || !action.emailBody) {
        return NextResponse.json({ type: 'chat', text: "I need an email address, a subject, and a body to draft the email." })
      }
      
      // Log if meeting details were extracted from the email context
      if (action.meetingDetails) {
        console.log(`[ExecutiveVAi] Draft includes meeting details:`, JSON.stringify(action.meetingDetails))
      }
      
      return NextResponse.json({
        type: 'chat',
        text: action.naturalResponse ?? `Here is your draft for ${action.emailTo}.`,
        action
      })
    }

    case 'send_email': {
      if (!googleToken) {
        return NextResponse.json({ type: 'chat', text: 'Please connect your Google account to send emails.' })
      }
      if (!action.emailTo || !action.emailSubject || !action.emailBody) {
        return NextResponse.json({ type: 'chat', text: "I need an email address, a subject, and a body to send the email." })
      }

      const result = await sendEmail(googleToken, action.emailTo, action.emailSubject, action.emailBody)
      
      if (!result.success) {
        return NextResponse.json({ type: 'chat', text: `Failed to send email: ${result.error}` })
      }

      return NextResponse.json({
        type: 'chat',
        text: action.naturalResponse ?? `Email sent to ${action.emailTo}.`,
        action
      })
    }

    // ── Travel Mode ───────────────────────────────────────────────────────
    case 'travel_mode': {
      return NextResponse.json({
        type: 'chat',
        text: action.naturalResponse || `Safe travels to ${action.targetCity}! I've noted the timezone change. Would you like me to shift your existing meetings to align with local time?`,
        action
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
  } catch (err: any) {
    console.error('[ExecutiveVAi] Intent Execution Error:', err)
    
    // Feature: Better Error Transparency
    let errMsg = err.message || 'Unknown error occurred.'
    // Format Google API errors neatly if present
    if (err.errors && err.errors.length > 0) {
      errMsg = err.errors[0].message
    }
    
    return NextResponse.json({ 
      type: 'chat', 
      text: `⚠️ I ran into an issue trying to do that: *${errMsg}*. Please check your inputs or try again.` 
    })
  }
}
