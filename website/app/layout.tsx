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
  themeColor: '#fdfdfc',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Serif:wght@400;500;600&family=Inter:wght@100..900&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
