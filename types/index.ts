// ─── Shared TypeScript types for MeetMate ────────────────────────────────────

export type MeetingPlatform = 'google_meet' | 'zoom'

export type TaskType = 'meeting' | 'deep_work' | 'focus' | 'admin'

export type Priority = 'high' | 'medium' | 'low'

export type AgentIntent =
  | 'create_meeting'
  | 'create_event'
  | 'find_slots'
  | 'morning_intake'
  | 'daily_briefing'
  | 'time_analysis'
  | 'reschedule'
  | 'cancel'
  | 'list_today'
  | 'reminder_ack'
  | 'add_expense'
  | 'view_budget'
  | 'read_emails'
  | 'draft_email'
  | 'send_email'
  | 'clarify'

// ─── Gemini JSON response shape ───────────────────────────────────────────────
export interface AgentAction {
  intent: AgentIntent
  platform?: MeetingPlatform | null
  title?: string
  duration?: number           // minutes
  startTime?: string | null   // ISO 8601
  attendees?: string[]
  tasks?: ScheduleTask[]
  rangeStart?: string | null
  rangeEnd?: string | null
  clarifyQuestion?: string
  expenseAmount?: number
  expenseCategory?: string
  emailTo?: string
  emailSubject?: string
  emailBody?: string
  naturalResponse: string
}

// ─── Schedule / Day Plan ──────────────────────────────────────────────────────
export interface ScheduleTask {
  name: string
  priority: Priority
  estimatedMinutes: number
  type: TaskType
  startTime?: string          // ISO 8601, filled after scheduling
  endTime?: string
  eventId?: string            // Google Calendar event ID
  meetLink?: string           // if meeting type
  zoomLink?: string
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
export interface BusySlot {
  start: string               // ISO 8601
  end: string
}

export interface FreeSlot {
  start: string
  end: string
  durationMinutes: number
  label: string               // e.g. "Tuesday 10:00–11:30"
}

// ─── Meeting creation result ──────────────────────────────────────────────────
export interface MeetingResult {
  platform: MeetingPlatform
  title: string
  startTime: string
  duration: number
  meetLink?: string
  zoomLink?: string
  joinUrl?: string
  eventId?: string
}

// ─── Reminder ─────────────────────────────────────────────────────────────────
export interface Reminder {
  id: string
  message: string
  fireAt: string              // ISO 8601
  taskName: string
  fired: boolean
}

// ─── Chat message ─────────────────────────────────────────────────────────────
export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  action?: AgentAction        // structured data if assistant executed an action
  meetingResult?: MeetingResult
  schedule?: ScheduleTask[]
  freeSlots?: FreeSlot[]
  budgetResult?: { monthlyLimit: number; expenses: any[]; newExpenseAdded?: boolean }
  emails?: any[]
}
