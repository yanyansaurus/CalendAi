import { connectRedis } from './redis'

export interface Task {
  id: string
  title: string
  description?: string
  priority: 'high' | 'medium' | 'low' | 'recreational'
  status: 'todo' | 'in_progress' | 'done'
  dueDate?: string
  createdAt: string
}

function taskKey(userId: string) {
  return `tasks:${userId}`
}

export async function getTasks(userId: string): Promise<Task[]> {
  try {
    const redis = await connectRedis()
    const raw = await redis.get(taskKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('[Redis] getTasks failed:', err)
    return []
  }
}

export async function saveTasks(userId: string, tasks: Task[]): Promise<Task[]> {
  try {
    const redis = await connectRedis()
    await redis.set(taskKey(userId), JSON.stringify(tasks))
    return tasks
  } catch (err) {
    console.error('[Redis] saveTasks failed:', err)
    return tasks
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
  try {
    const redis = await connectRedis()
    tasks.push(newTask)
    await redis.set(taskKey(userId), JSON.stringify(tasks))
    return tasks
  } catch (err) {
    console.error('[Redis] addTask failed:', err)
    return tasks
  }
}

export async function updateTask(userId: string, taskId: string, updates: Partial<Task>): Promise<Task[]> {
  const tasks = await getTasks(userId)
  const idx = tasks.findIndex(t => t.id === taskId)
  if (idx === -1) return tasks
  tasks[idx] = { ...tasks[idx], ...updates }
  try {
    const redis = await connectRedis()
    await redis.set(taskKey(userId), JSON.stringify(tasks))
    return tasks
  } catch (err) {
    console.error('[Redis] updateTask failed:', err)
    return tasks
  }
}

export async function deleteTask(userId: string, taskId: string): Promise<Task[]> {
  let tasks = await getTasks(userId)
  tasks = tasks.filter(t => t.id !== taskId)
  try {
    const redis = await connectRedis()
    await redis.set(taskKey(userId), JSON.stringify(tasks))
    return tasks
  } catch (err) {
    console.error('[Redis] deleteTask failed:', err)
    return tasks
  }
}
