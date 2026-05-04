import { auth } from '@/lib/auth'
import { getContacts, addContact, deleteContact } from '@/lib/contactEngine'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const contacts = await getContacts(session.user.email)
  return NextResponse.json({ contacts })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, email } = await req.json()
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }
  const contacts = await addContact(session.user.email, { name: name.trim(), email: email.trim() })
  return NextResponse.json({ contacts })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { contactId } = await req.json()
  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 })
  const contacts = await deleteContact(session.user.email, contactId)
  return NextResponse.json({ contacts })
}
