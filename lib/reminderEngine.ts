import { randomUUID } from 'crypto'
import type { Reminder, ScheduleTask } from '@/types'
import { localKV } from '@/lib/localKV'

let redisClient: any = null

// ─── Use Redis Labs in production, local in-memory store in dev ───────────────
async function getKV() {
  if (process.env.calend_ai_kv_REDIS_URL) {
    if (!redisClient) {
      const { createClient } = await import('redis')
      redisClient = createClient({ url: process.env.calend_ai_kv_REDIS_URL })
      await redisClient.connect()
    }
    return {
      async get<T = string>(key: string): Promise<T | null> {
        const val = await redisClient.get(key)
        if (!val) return null
        try { return JSON.parse(val) as T } catch { return val as unknown as T }
      },
      async set(key: string, value: unknown, opts?: { ex?: number }) {
        const val = typeof value === 'string' ? value : JSON.stringify(value)
        if (opts?.ex) {
          await redisClient.set(key, val, { EX: opts.ex })
        } else {
          await redisClient.set(key, val)
        }
      },
      async keys(pattern: string): Promise<string[]> {
        return await redisClient.keys(pattern)
      }
    }
  }
  return localKV
}

// ─── Store the day's task schedule ───────────────────────────────────────────
export async function saveSchedule(userId: string, tasks: ScheduleTask[]) {
  const kv = await getKV()
  await kv.set(`schedule:${userId}:today`, JSON.stringify(tasks), { ex: 86400 })
}

export async function getSchedule(userId: string): Promise<ScheduleTask[]> {
  const kv  = await getKV()
  const raw = await kv.get<string>(`schedule:${userId}:today`)
  if (!raw) return []
  try { return JSON.parse(raw as string) } catch { return [] }
}

// ─── Reminder engine ──────────────────────────────────────────────────────────
export async function scheduleReminder(
  userId: string,
  taskName: string,
  message: string,
  fireAt: Date,
) {
  const kv = await getKV()
  const reminder: Reminder = {
    id:       randomUUID(),
    message,
    taskName,
    fireAt:   fireAt.toISOString(),
    fired:    false,
  }
  const ttl = Math.max(3600, Math.ceil((fireAt.getTime() - Date.now()) / 1000) + 3600)
  await kv.set(`reminders:${userId}:${reminder.id}`, JSON.stringify(reminder), { ex: ttl })
}

export async function getDueReminders(userId: string): Promise<Reminder[]> {
  const kv   = await getKV()
  const keys = await kv.keys(`reminders:${userId}:*`)
  const due: Reminder[] = []

  for (const key of keys) {
    const raw = await kv.get<string>(key)
    if (!raw) continue
    try {
      const reminder: Reminder = JSON.parse(raw as string)
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
