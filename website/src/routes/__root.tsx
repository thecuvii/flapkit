import type { ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
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
        {import.meta.env.DEV && <link rel="stylesheet" href="/virtual:stylex.css" />}
        {import.meta.env.DEV && <script type="module" src="/@id/virtual:stylex:runtime" />}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
