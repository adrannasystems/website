import { SignIn } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

export type SignInSearch = { redirect_url?: string }

export function validateSignInSearch(search: Record<string, unknown>): SignInSearch {
  const redirectUrl = search.redirect_url
  if (typeof redirectUrl !== 'string' || redirectUrl === '') {
    return {}
  }

  return { redirect_url: redirectUrl }
}

export async function redirectSignedInUsers() {
  const userId = await getUserId()
  if (userId !== null) {
    throw redirect({ to: '/tasks' })
  }
}

export function SignInRoutePage(props: { redirectUrl?: string }) {
  const fallbackRedirectUrl = props.redirectUrl ?? '/tasks'

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-20">
      <SignIn path="/sign-in" routing="path" fallbackRedirectUrl={fallbackRedirectUrl} />
    </main>
  )
}

const getUserId = createServerFn({ method: 'GET' }).handler(async () => {
  const authState = await auth()
  return authState.userId
})
