import { auth } from '@/lib/auth'
import { getTasks, addTask, updateTask, deleteTask } from '@/lib/taskEngine'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tasks = await getTasks(session.user.email)
  return NextResponse.json({ tasks })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const tasks = await addTask(session.user.email, {
    title: body.title,
    description: body.description,
    priority: body.priority ?? 'medium',
    dueDate: body.dueDate,
  })
  return NextResponse.json({ tasks })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { taskId, ...updates } = await req.json()
  const tasks = await updateTask(session.user.email, taskId, updates)
  return NextResponse.json({ tasks })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { taskId } = await req.json()
  const tasks = await deleteTask(session.user.email, taskId)
  return NextResponse.json({ tasks })
}
