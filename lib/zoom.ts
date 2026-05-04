// ─── Zoom Server-to-Server OAuth + API helpers ───────────────────────────────

const ZOOM_BASE = 'https://api.zoom.us/v2'

interface ZoomMeetingOptions {
  title: string
  startTime: string   // ISO 8601
  durationMinutes: number
  timezone?: string
}

interface ZoomMeetingResult {
  joinUrl: string
  meetingId: string
  password: string
  startUrl: string
}

// ─── Token cache (in-memory, refreshed when expired) ─────────────────────────
let cachedToken: string | null = null
let tokenExpiry = 0

/**
 * Fetch a Zoom access token using Server-to-Server OAuth (account credentials).
 * Tokens are cached in memory and auto-refreshed when expired.
 */
export async function getZoomAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60_000) {
    return cachedToken
  }

  const accountId    = process.env.ZOOM_ACCOUNT_ID
  const clientId     = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.***REMOVED***

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Missing Zoom credentials. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ***REMOVED*** in .env.local')
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[Zoom] Token error:', err)
    throw new Error(`Zoom token error: ${err.reason ?? err.error ?? res.statusText}`)
  }

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in * 1000)  // typically 1 hour

  console.log('[Zoom] Access token obtained, expires in', data.expires_in, 'seconds')
  return cachedToken!
}

/**
 * Check if Zoom is configured (all required env vars present).
 */
export function isZoomConfigured(): boolean {
  return !!(process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.***REMOVED***)
}

// ─── Create a Zoom meeting ───────────────────────────────────────────────────
export async function createZoomMeeting(
  accessToken: string,
  opts: ZoomMeetingOptions,
): Promise<ZoomMeetingResult> {
  const res = await fetch(`${ZOOM_BASE}/users/me/meetings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic:      opts.title,
      type:       2,           // scheduled meeting
      start_time: opts.startTime,
      duration:   opts.durationMinutes,
      timezone:   opts.timezone ?? 'UTC',
      settings: {
        join_before_host: true,
        waiting_room:     false,
        auto_recording:  'none',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Zoom API error: ${err.message ?? res.statusText}`)
  }

  const data = await res.json()
  return {
    joinUrl:   data.join_url,
    meetingId: String(data.id),
    password:  data.password ?? '',
    startUrl:  data.start_url,
  }
}

export async function listZoomMeetings(accessToken: string) {
  const res = await fetch(`${ZOOM_BASE}/users/me/meetings?type=scheduled`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to list Zoom meetings')
  const data = await res.json()
  return data.meetings ?? []
}
