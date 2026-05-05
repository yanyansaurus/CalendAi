import { NextResponse } from 'next/server'
import { pushEmailNotification } from '@/lib/redisTokens'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Please log in to test notifications.' })
  }

  const fakeNotification = {
    actionText: "Meeting Request: Hackathon Planning",
    threadId: "test_thread_" + Date.now(),
    from: "Judges Panel",
    subject: "Final Presentation details",
    snippet: "Please ensure your project is deployed and your presentation covers all the requested features..."
  }

  await pushEmailNotification(session.user.email, fakeNotification)

  return NextResponse.json({ 
    success: true, 
    message: "Test notification sent! Check your ExecutiveVAi dashboard (it should pop up within 10-60 seconds depending on the polling cycle)."
  })
}
