import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    googleAccessToken?:  string
    googleRefreshToken?: string
    zoomAccessToken?:    string
    zoomRefreshToken?:   string
  }
}
