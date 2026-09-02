import type { ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import '@thecuvii/flapkit/flapkit.css'
import '@thecuvii/flapkit/looks/airport.css'
import '@thecuvii/flapkit/looks/industrial.css'
import '../../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        name: 'description',
        content:
          'Composable React split-flap displays with mechanical motion, sound, and customizable looks.',
      },
      { name: 'theme-color', content: '#ffffff' },
      { title: 'Flapkit — Split-flap displays for React' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
