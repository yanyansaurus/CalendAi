import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    success: false, 
    message: "Notification system is currently disabled to conserve Gemini quota and reduce Redis load."
  })
}
