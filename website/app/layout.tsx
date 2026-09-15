import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@fontsource/commit-mono/400.css'
import '@fontsource/commit-mono/500.css'
import '@fontsource/commit-mono/600.css'
import '@fontsource/commit-mono/700.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource-variable/inter'
import '@fontsource/shantell-sans/400.css'
import './styles.css'
import 'flapkit/flapkit.css'
import 'flapkit/airport.css'
import 'flapkit/industrial.css'
import { SiteGrain } from '../modules/site/site-grain'

export const metadata: Metadata = {
  metadataBase: new URL('https://cuvii.dev/flapkit/'),
  title: 'Flapkit — Split-flap displays for React',
  description: 'React split-flap displays with motion, sound, and custom looks.',
}

export const viewport: Viewport = {
  themeColor: '#323232',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteGrain />
        {children}
      </body>
    </html>
  )
}
