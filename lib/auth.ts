import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'

// ─── Zoom custom OAuth provider ───────────────────────────────────────────────
const ZoomProvider = {
  id: 'zoom',
  name: 'Zoom',
  type: 'oauth' as const,
  clientId: process.env.ZOOM_CLIENT_ID!,
  clientSecret: process.env.***REMOVED***!,
  authorization: {
    url: 'https://zoom.us/oauth/authorize',
    params: { scope: 'meeting:write meeting:write:admin' },
  },
  token: 'https://zoom.us/oauth/token',
  userinfo: 'https://api.zoom.us/v2/users/me',
  profile(profile: { id: string; email: string; display_name: string }) {
    return {
      id: profile.id,
      name: profile.display_name,
      email: profile.email,
    }
  },
}

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    ZoomProvider,
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // Persist access_token + refresh_token onto the JWT
    async jwt({ token, account }) {
      if (account) {
        if (account.provider === 'google') {
          token.googleAccessToken  = account.access_token
          token.googleRefreshToken = account.refresh_token
          token.googleExpiry       = account.expires_at
        }
        if (account.provider === 'zoom') {
          token.zoomAccessToken  = account.access_token
          token.zoomRefreshToken = account.refresh_token
          token.zoomExpiry       = account.expires_at
        }
      }
      return token
    },
    // Expose tokens on the client-side session object
    async session({ session, token }) {
      session.googleAccessToken  = token.googleAccessToken  as string | undefined
      session.googleRefreshToken = token.googleRefreshToken as string | undefined
      session.zoomAccessToken    = token.zoomAccessToken    as string | undefined
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
