import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GitReverse | Selective History Replay',
  description: 'Replay your git history into target repositories with precision.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
