import { google } from 'googleapis'

function getAuthClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  auth.setCredentials({ access_token: accessToken })
  return auth
}

// ─── Fetch Unread Email IDs (Efficient) ──────────────────────────────────────
export async function getUnreadEmailIds(accessToken: string, maxResults = 100) {
  const auth = getAuthClient(accessToken)
  const gmail = google.gmail({ version: 'v1', auth })

  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox',
      maxResults,
    })
    return (res.data.messages || []).map(m => m.id!)
  } catch (err: any) {
    console.error('Gmail List Error:', err)
    return []
  }
}

// ─── Fetch Unread Emails (Inbox Triage) ──────────────────────────────────────
export async function getUnreadEmails(accessToken: string, maxResults = 10) {
  const auth = getAuthClient(accessToken)
  const gmail = google.gmail({ version: 'v1', auth })

  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox',
      maxResults,
    })

    const messages = res.data.messages || []
    if (messages.length === 0) return []

    const fullMessages = await Promise.all(
      messages.map(async (msg) => {
        const m = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full',
        })
        
        const headers = m.data.payload?.headers
        const subject = headers?.find(h => h.name === 'Subject')?.value ?? 'No Subject'
        const from = headers?.find(h => h.name === 'From')?.value ?? 'Unknown'
        const date = headers?.find(h => h.name === 'Date')?.value ?? ''
        
        // Helper to recursively find plain text or HTML body
        const extractBody = (part: any): string => {
          if (!part) return ''
          if (part.mimeType === 'text/plain' && part.body?.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf-8')
          }
          if (part.mimeType === 'text/html' && part.body?.data) {
            const html = Buffer.from(part.body.data, 'base64').toString('utf-8')
            return html.replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' ').trim()
          }
          if (part.parts && part.parts.length > 0) {
            for (const p of part.parts) {
              const text = extractBody(p)
              if (text) return text
            }
          }
          return ''
        }

        let body = extractBody(m.data.payload) || ''


        return { id: msg.id!, subject, from, date, body: body.substring(0, 500) + '...' } // Truncate body to save AI tokens
      })
    )

    return fullMessages
  } catch (err: any) {
    console.error('Gmail API Error:', err)
    return []
  }
}

// ─── Send an Email (Smart Drafting) ──────────────────────────────────────────
export async function sendEmail(accessToken: string, to: string, subject: string, body: string) {
  const auth = getAuthClient(accessToken)
  const gmail = google.gmail({ version: 'v1', auth })

  const rawMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    '',
    body.replace(/\n/g, '<br>')
  ].join('\n')

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    })
    return { success: true, messageId: res.data.id }
  } catch (err: any) {
    console.error('Send Email Error:', err)
    return { success: false, error: err.message }
  }
}
// ─── Mark as Read ────────────────────────────────────────────────────────────
export async function markEmailAsRead(accessToken: string, messageId: string) {
  const auth = getAuthClient(accessToken)
  const gmail = google.gmail({ version: 'v1', auth })

  try {
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: [messageId],
        removeLabelIds: ['UNREAD']
      }
    })
    return { success: true }
  } catch (err: any) {
    console.error('Mark as Read Error:', err)
    return { success: false, error: err.message }
  }
}

// ─── Mark Multiple as Read ───────────────────────────────────────────────────
export async function markMultipleAsRead(accessToken: string, messageIds: string[]) {
  if (messageIds.length === 0) return { success: true };
  const auth = getAuthClient(accessToken)
  const gmail = google.gmail({ version: 'v1', auth })

  try {
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: messageIds,
        removeLabelIds: ['UNREAD']
      }
    })
    return { success: true }
  } catch (err: any) {
    console.error('Mark All as Read Error:', err)
    return { success: false, error: err.message }
  }
}
