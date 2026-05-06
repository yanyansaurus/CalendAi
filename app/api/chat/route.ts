import { auth } from '@/lib/auth'
import { SYSTEM_PROMPT } from '@/lib/gemini'
import { getAIResponse, AIMessage } from '@/lib/ai'
import { parseIntent } from '@/lib/intentParser'
import { getFreeBusy, createGoogleMeet, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getTodayEvents, getWeekEvents, createGoogleTask } from '@/lib/googleCalendar'
import { getUnreadEmails, sendEmail } from '@/lib/gmail'
import { createZoomMeeting, getZoomAccessToken, isZoomConfigured } from '@/lib/zoom'
import { getSchedule, saveSchedule, scheduleRemindersForPlan } from '@/lib/reminderEngine'
import { getContacts } from '@/lib/contactEngine'
import { getBudgetData, addExpense } from '@/lib/budgetEngine'
import { colorIdForType } from '@/lib/intentParser'
import type { ScheduleTask, MeetingResult, FreeSlot, AgentAction } from '@/types'
import { computeFreeSlots } from '@/lib/googleCalendar'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message, history = [], imageBase64, meetingPreference = 'Google Meet' } = await req.json()
  const userId = session.user.email
  const googleToken = session.googleAccessToken
  const zoomConfigured = isZoomConfigured()
  const timezone = req.headers.get('x-timezone') ?? 'UTC'

  let weekBusySlots: Array<{ start: string; end: string }> = []
  let weekEvents: Array<any> = []
  if (googleToken) {
    try {
      // Fetch 7 days of context
      weekBusySlots = await getFreeBusy(googleToken, 'this_week', timezone)
      weekEvents = await getWeekEvents(googleToken)
    } catch { /* ignore */ }
  }
  const todaySchedule = await getSchedule(userId)

  // ── Format context to prevent AI timezone hallucinations ───────────────────
  const localTime = new Date().toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  const formattedBusySlots = weekBusySlots.map(slot => ({
    start: new Date(slot.start).toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' }),
    end: new Date(slot.end).toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' })
  }))
  const formattedWeekEvents = weekEvents.map(ev => ({
    title: ev.title,
    start: new Date(ev.start).toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' }),
    end: new Date(ev.end).toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' })
  }))

  const contacts = await getContacts(userId)
  const formattedContacts = contacts.map(c => `${c.name} (${c.email})`).join(', ')

  const systemPrompt = SYSTEM_PROMPT
    .replace('{currentTime}', localTime)
    .replace('{userTimezone}', timezone)
    .replace('{contacts}', formattedContacts || 'No contacts saved yet.')
    .replace('{busySlots}', JSON.stringify(formattedBusySlots))
    .replace('{weekEvents}', JSON.stringify(formattedWeekEvents))
    .replace('{todaySchedule}', JSON.stringify(todaySchedule))
    .replace('{meetingPreference}', meetingPreference)

  // ── Call AI Bridge ────────────────────────────────────────────────────────
  let aiMessages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(history || []).map((m: any) => ({
      role: (m.role === 'assistant' || m.role === 'model') ? 'assistant' : 'user',
      content: m.content
    }))
  ]

  // Add the current user message
  if (imageBase64) {
    aiMessages.push({
      role: 'user',
      content: [
        { type: 'text', text: message },
        { type: 'image_url', image_url: { url: imageBase64 } }
      ]
    })
  } else {
    aiMessages.push({ role: 'user', content: message })
  }

  let rawResponse: string
  try {
    rawResponse = await getAIResponse(aiMessages, {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile'
    })
  } catch (err: any) {
    console.error('[ExecutiveVAi] AI Error:', err.message)
    const errorMsg = err.message.toLowerCase()
    
    // User-friendly catch for rate limits, credit depletion, or missing models
    if (errorMsg.includes('429') || errorMsg.includes('credits') || errorMsg.includes('too many requests') || errorMsg.includes('limit reached') || errorMsg.includes('404') || errorMsg.includes('not found')) {
      return NextResponse.json({
        type: 'chat',
        text: "sorry our ai is limited yun can resubmit in 30 seconds",
      })
    }

    return NextResponse.json({
      type: 'chat',
      text: `⚠️ AI Service Error: ${err.message}. Please try again in a moment.`,
    })
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

  // ── Unified Response Handling ──────────────────────────────────────────
  const action = parsed.action as AgentAction
  if (action) action.busySlots = formattedBusySlots // Pass for UI timeline

  const isChat = parsed.isChat || action?.intent === 'chat'

  if (isChat) {
    return NextResponse.json({
      type: 'chat',
      text: action?.naturalResponse || parsed.chatText || "I'm not sure how to help with that.",
      suggestedAnswers: action?.suggestedAnswers || []
    })
  }

  // ── Execute the intent ────────────────────────────────────────────────────
  try {
    switch (action.intent) {

      case 'draft_meeting':
      case 'draft_event': {
        return NextResponse.json({
          type: 'draft_event',
          text: action.naturalResponse ?? "I've drafted the details for you. Ready to confirm?",
          action,
          suggestedAnswers: action?.suggestedAnswers || ['Confirm & Sync', 'Change time', 'Cancel']
        })
      }

      case 'show_meeting_wizard': {
        return NextResponse.json({
          type: 'show_meeting_wizard',
          text: action.naturalResponse || "Let's schedule that. Please fill out the details below:",
          action
        })
      }

      // ── Create a meeting ──────────────────────────────────────────────────
      case 'create_meeting': {
        // DRAFT-FIRST SAFETY CATCH:
        const isConfirmation = message.toLowerCase().includes('confirm') ||
          message.toLowerCase().includes('yes') ||
          message.toLowerCase().includes('looks good') ||
          message.toLowerCase().includes('schedule it');

        if (!isConfirmation && !action.eventId) {
          console.log(`[ExecutiveVAi] Intercepted 'create_meeting' -> forcing 'draft_meeting' for safety.`);
          return NextResponse.json({
            type: 'draft_event',
            text: "I've drafted a meeting link for you. Ready to send the invites?",
            action: { ...action, intent: 'draft_meeting' },
            suggestedAnswers: ['Confirm & Sync', 'Change time', 'Cancel']
          })
        }

        let startTime = new Date(Date.now() + 5 * 60000).toISOString()
        if (action.startTime) {
          // Ensure AI's floating timestamp is converted to a proper UTC ISO string based on server timezone
          startTime = new Date(action.startTime).toISOString()
        }
        const duration = action.duration ?? 30
        const title = action.title ?? 'Meeting'
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
            platform: 'zoom',
            title,
            startTime,
            duration,
            agenda: action.agenda,
            zoomLink: zoom.joinUrl,
            joinUrl: zoom.joinUrl,
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
            agenda: action.agenda,
            meetLink: meet.meetLink,
            eventId: meet.eventId,
          }
        }
        if (googleToken && action.attendees && action.attendees.length > 0) {
          const link = meetingResult?.joinUrl || meetingResult?.meetLink || meetingResult?.zoomLink || ''
          const subject = `Meeting Invitation: ${title}`
          const body = `Hi,\n\nYou have been invited to an upcoming meeting: ${title}.\n\nWhen: ${new Date(startTime).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}\nDuration: ${duration} minutes\nLink: ${link}\n\nAgenda:\n${action.agenda?.join('\n') || 'No agenda provided.'}\n\nLooking forward to it!`
          
          for (const email of action.attendees) {
            try {
              await sendEmail(googleToken, email, subject, body)
            } catch (err) {
              console.error(`[ExecutiveVAi] Failed to send invite to ${email}`, err)
            }
          }
        }

        return NextResponse.json({
          type: 'meeting',
          text: action.naturalResponse + " I have added it to your calendar and emailed the invitations to all attendees.",
          action,
          meetingResult,
          suggestedAnswers: action?.suggestedAnswers || []
        })
      }

      case 'create_event': {
        // DRAFT-FIRST SAFETY CATCH:
        // If the intent is 'create_event' but the user message doesn't contain confirmation keywords,
        // and it's not a direct continuation of a draft, we force it to 'draft_event'.
        const isConfirmation = message.toLowerCase().includes('confirm') ||
          message.toLowerCase().includes('yes') ||
          message.toLowerCase().includes('looks good') ||
          message.toLowerCase().includes('add it now');

        if (!isConfirmation && !action.eventId) {
          console.log(`[ExecutiveVAi] Intercepted 'create_event' -> forcing 'draft_event' for safety.`);
          return NextResponse.json({
            type: 'draft_event',
            text: "I've drafted that for you. Would you like me to add it to your calendar?",
            action: { ...action, intent: 'draft_event' },
            suggestedAnswers: ['Confirm & Sync', 'Change time', 'Cancel']
          })
        }

        if (!googleToken) {
          return NextResponse.json({ type: 'chat', text: '⚠️ Google Calendar is not connected. Please sign out and sign back in to reconnect.' })
        }

        let startTime = new Date(Date.now() + 5 * 60000).toISOString()
        if (action.startTime) {
          startTime = new Date(action.startTime).toISOString()
        }
        const duration = action.duration ?? 60
        const title = action.title ?? 'Event'
        const endTime = new Date(new Date(startTime).getTime() + duration * 60000).toISOString()

        // Pick a color based on the event type if tasks are provided
        const taskType = action.tasks?.[0]?.type
        const colorId = taskType ? colorIdForType(taskType) : '9' // default to blueberry

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
            type: 'chat',
            text: action.naturalResponse ?? `✅ Done! I've added "${title}" to your calendar.`,
            action: { ...action, eventId: ev.eventId },
            suggestedAnswers: action?.suggestedAnswers || []
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

      // ── Analyze Weekly Routine ────────────────────────────────────────────
      case 'analyze_routine': {
        try {
          const { analyzeWeeklyRoutine } = await import('@/app/actions/routine.action')
          // Pass the user's latest message as details if they are responding to a prompt
          const details = history.length > 0 ? history[history.length - 1].content : undefined
          const result = await analyzeWeeklyRoutine(details)

          if (result.hasRoutine === false) {
            return NextResponse.json({
              type: 'chat',
              text: result.messageToUser,
              action: { intent: 'show_routine_modal' }
            })
          } else if (result.suggestedRoutine && result.suggestedRoutine.length > 0) {
            return NextResponse.json({
              type: 'schedule',
              text: result.messageToUser,
              schedule: result.suggestedRoutine,
              action: { intent: 'analyze_routine', tasks: result.suggestedRoutine }
            })
          } else {
            return NextResponse.json({
              type: 'chat',
              text: result.messageToUser,
            })
          }
        } catch (err: any) {
          console.error('Routine analysis error:', err)
          return NextResponse.json({ type: 'chat', text: '⚠️ Error analyzing routine: ' + err.message })
        }
      }

      // ── Find free slots ───────────────────────────────────────────────────
      case 'find_slots': {
        if (!googleToken) {
          return NextResponse.json({ type: 'chat', text: 'Please connect your Google Calendar first.' })
        }
        const now = new Date()
        const weekEnd = new Date(now)
        weekEnd.setDate(now.getDate() + 7)

        const { getPreferences } = await import('@/lib/reminderEngine')
        const prefs = await getPreferences(userId)

        const allBusy = await getFreeBusy(googleToken, { start: now.toISOString(), end: weekEnd.toISOString() }, timezone)
        const slots: FreeSlot[] = computeFreeSlots(
          allBusy,
          now,
          weekEnd,
          action.duration ?? 60,
          prefs?.wakeTime ?? '09:00',
          prefs?.sleepTime ?? '22:00'
        ).slice(0, 3)

        return NextResponse.json({
          type: 'slots',
          text: action.naturalResponse,
          action,
          freeSlots: slots,
          suggestedAnswers: action?.suggestedAnswers || []
        })
      }

      // ── Morning intake — parse task dump & schedule the day ───────────────
      case 'morning_intake': {
        if (!googleToken || !action.tasks?.length) {
          return NextResponse.json({ type: 'chat', text: action.naturalResponse })
        }

        const { getPreferences } = await import('@/lib/reminderEngine')
        const prefs = await getPreferences(userId)

        const todayBusy = await getFreeBusy(googleToken, 'today', timezone)
        const todayFree = computeFreeSlots(
          todayBusy,
          new Date(),
          (() => {
            const d = new Date();
            if (prefs?.sleepTime) {
              const [h, m] = prefs.sleepTime.split(':').map(Number)
              d.setHours(h, m, 0, 0)
            } else {
              d.setHours(20, 0, 0, 0);
            }
            return d
          })(),
          15,
          prefs?.wakeTime ?? '09:00',
          prefs?.sleepTime ?? '22:00'
        )

        // Assign times to tasks from free slots
        const scheduled: ScheduleTask[] = []
        let freeIdx = 0

        for (const task of (action.tasks ?? [])) {
          if (freeIdx >= todayFree.length) break
          const slot = todayFree[freeIdx]
          const start = slot.start
          const end = new Date(
            new Date(start).getTime() + task.estimatedMinutes * 60000,
          ).toISOString()

          // Consume this slot (advance pointer past the task end)
          while (freeIdx < todayFree.length && new Date(todayFree[freeIdx].start) < new Date(end)) {
            freeIdx++
          }

          let taskId = ''
          try {
            const gt = await createGoogleTask(googleToken, {
              title: task.name,
              notes: `Scheduled via ExecutiveVAi. Duration: ${task.estimatedMinutes}m | Category: ${task.type}`,
              due: start
            })
            taskId = gt.id ?? ''
          } catch (err) {
            console.error('[ExecutiveVAi] Task sync error:', err)
          }

          scheduled.push({ ...task, startTime: start, endTime: end, taskId })
        }

        await saveSchedule(userId, scheduled)
        await scheduleRemindersForPlan(userId, scheduled)

        return NextResponse.json({
          type: 'schedule',
          text: action.naturalResponse,
          action,
          schedule: scheduled,
          suggestedAnswers: action?.suggestedAnswers || []
        })
      }

      // ── Daily briefing ────────────────────────────────────────────────────
      case 'daily_briefing':
      case 'list_today': {
        const plan = await getSchedule(userId)
        const budget = await getBudgetData(userId)
        return NextResponse.json({
          type: 'schedule',
          text: action.naturalResponse,
          action,
          schedule: plan,
          budgetResult: budget,
          suggestedAnswers: action?.suggestedAnswers || []
        })
      }

      // ── Reschedule a meeting ──────────────────────────────────────────────
      case 'reschedule': {
        if (!googleToken) return NextResponse.json({ type: 'chat', text: 'Google Calendar not connected.' })
        const title = action.title?.toLowerCase()

        // Search in our morning plan tasks FIRST
        let task = todaySchedule.find(t => t.name.toLowerCase().includes(title ?? ''))
        let eventId = task?.eventId

        // If not found in tasks, search in the actual calendar events for the week
        if (!eventId && title) {
          const foundEvent = weekEvents.find(e => e.title.toLowerCase().includes(title))
          if (foundEvent) {
            eventId = foundEvent.id
          }
        }

        if (!eventId) {
          return NextResponse.json({ type: 'chat', text: `I couldn't find a meeting named "${action.title}" to reschedule.` })
        }

        const duration = action.duration ?? (task?.estimatedMinutes || 60)
        const end = new Date(new Date(action.startTime!).getTime() + duration * 60000).toISOString()

        await updateCalendarEvent(googleToken, eventId, {
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
          budgetResult: data,
          suggestedAnswers: action?.suggestedAnswers || []
        })
      }

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
          const analysisText = await getAIResponse([
            { role: 'system', content: 'Analyze the following emails and provide a smart, professional summary.' },
            { role: 'user', content: emailAnalysisPrompt }
          ], { jsonMode: false })

          let finalAnalysis = analysisText.trim()
          if (finalAnalysis.startsWith('CHAT:')) {
            finalAnalysis = finalAnalysis.substring(5).trim()
          }

          return NextResponse.json({
            type: 'chat',
            text: analysisText,
            action,
            emails,
            suggestedAnswers: action?.suggestedAnswers || []
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

      // (Duplicate draft cases removed)

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
          action,
          suggestedAnswers: action?.suggestedAnswers || []
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

      // ── Time Analysis ─────────────────────────────────────────────────────
      case 'time_analysis': {
        if (!googleToken) {
          return NextResponse.json({ type: 'chat', text: 'Please connect your Google Calendar to analyze your time.' })
        }

        const { getWeekEvents } = await import('@/lib/googleCalendar')
        const events = await getWeekEvents(googleToken)

        if (!events || events.length === 0) {
          return NextResponse.json({ type: 'chat', text: 'Your calendar has been empty this week, so there is no time data to analyze.' })
        }

        const analysisPrompt = `
You are ExecutiveVAi. The user wants to analyze how they spent their time this past week.
Here are the raw events from their calendar: ${JSON.stringify(events.map((e: any) => ({ title: e.summary, start: e.start?.dateTime, end: e.end?.dateTime })))}

Analyze these events and generate a highly professional, concise breakdown of their week.
1. Start with a 1-sentence summary of the week's theme (e.g. meeting-heavy, focused, etc).
2. Group the time into estimated buckets (Meetings, Deep Work, Admin, etc).
3. Give one actionable piece of advice for next week.
Keep the formatting clean using markdown bolding. No code blocks.
`
        const analysisText = await getAIResponse([
          { role: 'system', content: 'You are ExecutiveVAi, a time-management analyst. Provide a professional markdown breakdown.' },
          { role: 'user', content: analysisPrompt }
        ], { jsonMode: false })

        return NextResponse.json({
          type: 'chat',
          text: (action.naturalResponse ? action.naturalResponse + '\n\n---\n\n' : '') + analysisText,
          action,
          suggestedAnswers: action?.suggestedAnswers || []
        })
      }

      // ── Show Week Modal ──────────────────────────────────────────────────
      case 'show_week_modal':
        return NextResponse.json({
          type: 'chat',
          text: action.naturalResponse ?? "I've opened your weekly schedule so you can find the best slot.",
          action,
          suggestedAnswers: action?.suggestedAnswers || []
        })

      // ── Clarification needed ──────────────────────────────────────────────
      case 'clarify':
        return NextResponse.json({
          type: 'chat',
          text: action.clarifyQuestion ?? action.naturalResponse,
        })

      // ── All other intents — return natural response ───────────────────────
      default:
        return NextResponse.json({
          type: 'chat',
          text: action.naturalResponse,
          action,
          suggestedAnswers: action?.suggestedAnswers || []
        })
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
