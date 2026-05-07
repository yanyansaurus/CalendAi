import { kv } from './kv'

export interface Contact {
  id: string
  name: string
  email: string
  createdAt: string
}

function contactKey(userId: string) {
  return `contacts:${userId}`
}

export async function getContacts(userId: string): Promise<Contact[]> {
  try {
    const raw = await kv.get<Contact[]>(contactKey(userId))
    return raw || []
  } catch (err) {
    console.error('[ContactEngine] getContacts failed:', err)
    return []
  }
}

export async function addContact(userId: string, contact: Omit<Contact, 'id' | 'createdAt'>): Promise<Contact[]> {
  const contacts = await getContacts(userId)
  const newContact: Contact = {
    ...contact,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  try {
    contacts.push(newContact)
    await kv.set(contactKey(userId), contacts)
    return contacts
  } catch (err) {
    console.error('[ContactEngine] addContact failed:', err)
    return contacts
  }
}

export async function deleteContact(userId: string, contactId: string): Promise<Contact[]> {
  let contacts = await getContacts(userId)
  contacts = contacts.filter(c => c.id !== contactId)
  try {
    await kv.set(contactKey(userId), contacts)
    return contacts
  } catch (err) {
    console.error('[ContactEngine] deleteContact failed:', err)
    return contacts
  }
}
