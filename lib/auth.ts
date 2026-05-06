import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'

// Zoom is now handled via Server-to-Server OAuth (no user-facing provider needed).
// See lib/zoom.ts for the token management.

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
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.send',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        if (account.provider === 'google') {
          return {
            ...token,
            googleAccessToken: account.access_token,
            googleRefreshToken: account.refresh_token,
            googleExpiry: (account.expires_at ?? 0) * 1000, // store in ms
          }
        }
      }

      // Check if Google token is expired
      if (token.googleExpiry && Date.now() > (token.googleExpiry as number)) {
        return refreshGoogleToken(token)
      }

      return token
    },
    async session({ session, token }) {
      session.googleAccessToken = token.googleAccessToken as string | undefined
      session.googleRefreshToken = token.googleRefreshToken as string | undefined
      return session
    },
  },
}

async function refreshGoogleToken(token: any) {
  try {
    const url = 'https://oauth2.googleapis.com/token'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.googleRefreshToken,
      }),
    })

    const refreshedTokens = await res.json()
    if (!res.ok) throw refreshedTokens

    return {
      ...token,
      googleAccessToken: refreshedTokens.access_token,
      googleExpiry: Date.now() + (refreshedTokens.expires_in * 1000),
      googleRefreshToken: refreshedTokens.refresh_token ?? token.googleRefreshToken,
    }
  } catch (error) {
    console.error('Error refreshing Google token', error)
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
