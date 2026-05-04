import { createClient } from 'redis'

export interface Contact {
  id: string
  name: string
  email: string
  createdAt: string
}

function getRedis() {
  return createClient({ url: process.env.REDIS_URL ?? process.env.calend_ai_kv_REDIS_URL })
}

function contactKey(userId: string) {
  return `contacts:${userId}`
}

export async function getContacts(userId: string): Promise<Contact[]> {
  const redis = getRedis()
  await redis.connect()
  try {
    const raw = await redis.get(contactKey(userId))
    return raw ? JSON.parse(raw) : []
  } finally {
    await redis.disconnect()
  }
}

export async function addContact(userId: string, contact: Omit<Contact, 'id' | 'createdAt'>): Promise<Contact[]> {
  const contacts = await getContacts(userId)
  const newContact: Contact = {
    ...contact,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const redis = getRedis()
  await redis.connect()
  try {
    contacts.push(newContact)
    await redis.set(contactKey(userId), JSON.stringify(contacts))
    return contacts
  } finally {
    await redis.disconnect()
  }
}

export async function deleteContact(userId: string, contactId: string): Promise<Contact[]> {
  let contacts = await getContacts(userId)
  contacts = contacts.filter(c => c.id !== contactId)
  const redis = getRedis()
  await redis.connect()
  try {
    await redis.set(contactKey(userId), JSON.stringify(contacts))
    return contacts
  } finally {
    await redis.disconnect()
  }
}
