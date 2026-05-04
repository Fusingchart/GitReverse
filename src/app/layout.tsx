import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GitGhost — Synthetic History Synthesizer',
  description: 'Reconstruct synthetic development timelines with dependency-aware ordering and Poisson-distributed commit schedules.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
