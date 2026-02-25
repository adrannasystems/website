/// <reference types="vite/client" />

import * as React from 'react'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'

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
  beforeLoad: async () => {
    return {
      currentUserId: await getCurrentUserId(),
    }
  },
  component: RootComponent,
})

const getCurrentUserId = createServerFn({ method: 'GET' }).handler(async () => {
  const authState = await auth()
  return authState.userId
})

function RootComponent() {
  const [queryClient] = React.useState(() => new QueryClient())

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{"body { font-family: 'Inter', sans-serif; }"}</style>
      </head>
      <body className="bg-gray-50">
        <QueryClientProvider client={queryClient}>
          <ClerkProvider signInUrl="/sign-in">
            <SiteHeader />
            <Outlet />
          </ClerkProvider>
          {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}

function SiteHeader() {
  return (
    <header className="bg-white shadow-sm fixed w-full z-10">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-gray-800">
            Adranna Systems
          </a>
          <div className="hidden md:flex items-center gap-8">
            <a href="/#services" className="text-gray-600 hover:text-gray-900">
              Services
            </a>
            <a href="/#about" className="text-gray-600 hover:text-gray-900">
              About
            </a>
            <a href="/#contact" className="text-gray-600 hover:text-gray-900">
              Contact
            </a>
            <SignedOut>
              <div className="flex items-center gap-4">
                <SignInButton>
                  <button
                    type="button"
                    className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-gray-600 hover:text-gray-900"
                  >
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button
                    type="button"
                    className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 font-[inherit] text-white hover:bg-blue-700"
                  >
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-4">
                <Link to="/tasks" className="text-gray-600 hover:text-gray-900">
                  Tasks
                </Link>
                <UserButton />
              </div>
            </SignedIn>
          </div>
        </div>
      </nav>
    </header>
  )
}
