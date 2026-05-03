import { google } from 'googleapis'

function getAuthClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  auth.setCredentials({ access_token: accessToken })
  return auth
}

// ─── Fetch Unread Emails (Inbox Triage) ──────────────────────────────────────
export async function getUnreadEmails(accessToken: string, maxResults = 10) {
  const auth = getAuthClient(accessToken)
  const gmail = google.gmail({ version: 'v1', auth })

  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread category:primary',
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
        
        // Extract plain text body
        let body = ''
        if (m.data.payload?.parts) {
          const textPart = m.data.payload.parts.find(p => p.mimeType === 'text/plain')
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8')
          }
        } else if (m.data.payload?.body?.data) {
          body = Buffer.from(m.data.payload.body.data, 'base64').toString('utf-8')
        }

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
