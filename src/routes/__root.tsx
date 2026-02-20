/// <reference types="vite/client" />

import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        title: 'Adranna Systems - IT Development & Management Consulting',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{"body { font-family: 'Inter', sans-serif; }"}</style>
      </head>
      <body className="bg-gray-50">
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
