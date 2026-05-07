import { kv } from './kv'

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
    const raw = await kv.get<Task[]>(taskKey(userId))
    return raw || []
  } catch (err) {
    console.error('[TaskEngine] getTasks failed:', err)
    return []
  }
}

export async function saveTasks(userId: string, tasks: Task[]): Promise<Task[]> {
  try {
    await kv.set(taskKey(userId), tasks)
    return tasks
  } catch (err) {
    console.error('[TaskEngine] saveTasks failed:', err)
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
    tasks.push(newTask)
    await kv.set(taskKey(userId), tasks)
    return tasks
  } catch (err) {
    console.error('[TaskEngine] addTask failed:', err)
    return tasks
  }
}

export async function updateTask(userId: string, taskId: string, updates: Partial<Task>): Promise<Task[]> {
  const tasks = await getTasks(userId)
  const idx = tasks.findIndex(t => t.id === taskId)
  if (idx === -1) return tasks
  tasks[idx] = { ...tasks[idx], ...updates }
  try {
    await kv.set(taskKey(userId), tasks)
    return tasks
  } catch (err) {
    console.error('[TaskEngine] updateTask failed:', err)
    return tasks
  }
}

export async function deleteTask(userId: string, taskId: string): Promise<Task[]> {
  let tasks = await getTasks(userId)
  tasks = tasks.filter(t => t.id !== taskId)
  try {
    await kv.set(taskKey(userId), tasks)
    return tasks
  } catch (err) {
    console.error('[TaskEngine] deleteTask failed:', err)
    return tasks
  }
}
