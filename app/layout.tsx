import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MeetMate — AI Executive Assistant',
  description:
    'Chat with your AI Chief of Staff. Schedule Google Meet & Zoom calls, plan your day, and get intelligent calendar briefings — all through natural conversation.',
  keywords: ['AI assistant', 'calendar', 'executive', 'meeting scheduler', 'Google Meet', 'Zoom'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
