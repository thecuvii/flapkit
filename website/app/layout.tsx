import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@fontsource/commit-mono/400.css'
import '@fontsource/commit-mono/500.css'
import '@fontsource/commit-mono/600.css'
import '@fontsource/commit-mono/700.css'
import './styles.css'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/airport.css'
import '@thecuvii/flapkit/industrial.css'

export const metadata: Metadata = {
  title: 'Flapkit — Split-flap displays for React',
  description:
    'Composable React split-flap displays with mechanical motion, sound, and customizable looks.',
}

export const viewport: Viewport = {
  themeColor: '#323232',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400..700&display=swap"
        />
      </head>
      <body>
        <div
          className="pointer-events-none fixed inset-0 z-[999] bg-[image:var(--grain-image)] opacity-20 mix-blend-overlay"
          aria-hidden="true"
        />
        {children}
      </body>
    </html>
  )
}
