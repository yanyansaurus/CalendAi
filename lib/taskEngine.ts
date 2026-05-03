import { createClient } from 'redis'

export interface Task {
  id: string
  title: string
  description?: string
  priority: 'high' | 'medium' | 'low' | 'recreational'
  status: 'todo' | 'in_progress' | 'done'
  dueDate?: string
  createdAt: string
}

function getRedis() {
  return createClient({ url: process.env.REDIS_URL ?? process.env.calend_ai_kv_REDIS_URL })
}

function taskKey(userId: string) {
  return `tasks:${userId}`
}

export async function getTasks(userId: string): Promise<Task[]> {
  const redis = getRedis()
  await redis.connect()
  try {
    const raw = await redis.get(taskKey(userId))
    return raw ? JSON.parse(raw) : []
  } finally {
    await redis.disconnect()
  }
}

export async function saveTasks(userId: string, tasks: Task[]): Promise<Task[]> {
  const redis = getRedis()
  await redis.connect()
  try {
    await redis.set(taskKey(userId), JSON.stringify(tasks))
    return tasks
  } finally {
    await redis.disconnect()
  }
}

export async function addTask(userId: string, task: Omit<Task, 'id' | 'createdAt' | 'status'>): Promise<Task[]> {
  const tasks = await getTasks(userId)
  const newTask: Task = {
    ...task,
    id: crypto.randomUUID(),
    status: 'todo',
    createdAt: new Date().toISOString(),
  }
  // Re-connect since getTasks disconnected
  const redis = getRedis()
  await redis.connect()
  try {
    tasks.push(newTask)
    await redis.set(taskKey(userId), JSON.stringify(tasks))
    return tasks
  } finally {
    await redis.disconnect()
  }
}

export async function updateTask(userId: string, taskId: string, updates: Partial<Task>): Promise<Task[]> {
  const tasks = await getTasks(userId)
  const idx = tasks.findIndex(t => t.id === taskId)
  if (idx === -1) return tasks
  tasks[idx] = { ...tasks[idx], ...updates }
  const redis = getRedis()
  await redis.connect()
  try {
    await redis.set(taskKey(userId), JSON.stringify(tasks))
    return tasks
  } finally {
    await redis.disconnect()
  }
}

export async function deleteTask(userId: string, taskId: string): Promise<Task[]> {
  let tasks = await getTasks(userId)
  tasks = tasks.filter(t => t.id !== taskId)
  const redis = getRedis()
  await redis.connect()
  try {
    await redis.set(taskKey(userId), JSON.stringify(tasks))
    return tasks
  } finally {
    await redis.disconnect()
  }
}
