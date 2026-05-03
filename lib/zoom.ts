// ─── Zoom API helpers ─────────────────────────────────────────────────────────

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
