import { connectRedis } from './redis'

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
    const redis = await connectRedis()
    const raw = await redis.get(contactKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('[Redis] getContacts failed:', err)
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
    const redis = await connectRedis()
    contacts.push(newContact)
    await redis.set(contactKey(userId), JSON.stringify(contacts))
    return contacts
  } catch (err) {
    console.error('[Redis] addContact failed:', err)
    return contacts
  }
}

export async function deleteContact(userId: string, contactId: string): Promise<Contact[]> {
  let contacts = await getContacts(userId)
  contacts = contacts.filter(c => c.id !== contactId)
  try {
    const redis = await connectRedis()
    await redis.set(contactKey(userId), JSON.stringify(contacts))
    return contacts
  } catch (err) {
    console.error('[Redis] deleteContact failed:', err)
    return contacts
  }
}
