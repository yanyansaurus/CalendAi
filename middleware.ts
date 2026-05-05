import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  // If not authenticated and trying to access a protected route, redirect to landing
  if (!req.auth) {
    const url = req.nextUrl.clone()
    url.pathname = '/landing'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|login|landing).*)'],
}
