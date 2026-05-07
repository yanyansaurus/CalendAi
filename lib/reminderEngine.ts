import { randomUUID } from 'crypto'
import type { Reminder, ScheduleTask } from '@/types'
import { kv } from './kv'

// ─── Store the day's task schedule ───────────────────────────────────────────
export async function saveSchedule(userId: string, tasks: ScheduleTask[], date: string = 'today') {
  await kv.set(`schedule:${userId}:${date}`, tasks, { ex: 86400 })
}

export async function getSchedule(userId: string, date: string = 'today'): Promise<ScheduleTask[]> {
  const raw = await kv.get<ScheduleTask[]>(`schedule:${userId}:${date}`)
  return raw ?? []
}

// ─── Routine Preferences (Wake/Sleep) ────────────────────────────────────────
export async function savePreferences(userId: string, prefs: { wakeTime: string; sleepTime: string }) {
  await kv.set(`prefs:${userId}`, prefs)
}

export async function getPreferences(userId: string): Promise<{ wakeTime: string; sleepTime: string } | null> {
  return await kv.get<{ wakeTime: string; sleepTime: string }>(`prefs:${userId}`)
}

// ─── Chat history (cloud-persisted) ──────────────────────────────────────────
const CHAT_HISTORY_TTL = 7 * 86400  // 7 days

export async function saveChatHistory(userId: string, messages: any[]) {
  // Keep only the last 50 messages to avoid bloating
  const trimmed = messages.slice(-50)
  await kv.set(`chat:${userId}:history`, trimmed, { ex: CHAT_HISTORY_TTL })
}

export async function getChatHistory(userId: string): Promise<any[]> {
  const raw = await kv.get<any[]>(`chat:${userId}:history`)
  return raw ?? []
}

export async function clearChatHistory(userId: string) {
  await kv.set(`chat:${userId}:history`, [], { ex: CHAT_HISTORY_TTL })
}

// ─── Reminder engine ──────────────────────────────────────────────────────────
export async function scheduleReminder(
  userId: string,
  taskName: string,
  message: string,
  fireAt: Date,
) {
  const reminder: Reminder = {
    id:       randomUUID(),
    message,
    taskName,
    fireAt:   fireAt.toISOString(),
    fired:    false,
  }
  const ttl = Math.max(3600, Math.ceil((fireAt.getTime() - Date.now()) / 1000) + 3600)
  await kv.set(`reminders:${userId}:${reminder.id}`, reminder, { ex: ttl })
}

export async function getDueReminders(userId: string): Promise<Reminder[]> {
  const keys = await kv.keys(`reminders:${userId}:*`)
  const due: Reminder[] = []

  for (const key of keys) {
    const raw = await kv.get<any>(key)
    if (!raw) continue
    try {
      const reminder: Reminder = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (!reminder.fired && new Date(reminder.fireAt) <= new Date()) {
        reminder.fired = true
        await kv.set(key, JSON.stringify(reminder), { ex: 3600 })
        due.push(reminder)
      }
    } catch { /* skip */ }
  }
  return due
}

export async function scheduleRemindersForPlan(userId: string, tasks: ScheduleTask[]) {
  for (const task of tasks) {
    if (!task.startTime) continue
    const start         = new Date(task.startTime)
    const tenMinsBefore = new Date(start.getTime() - 10 * 60 * 1000)
    if (tenMinsBefore > new Date()) {
      await scheduleReminder(
        userId,
        task.name,
        `⏰ **${task.name}** starts in 10 minutes.`,
        tenMinsBefore,
      )
    }
  }
}
