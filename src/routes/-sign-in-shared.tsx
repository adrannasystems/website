import { SignIn } from '@clerk/tanstack-react-start'
import { redirect } from '@tanstack/react-router'

export type SignInSearch = { redirect_url?: string }

export function validateSignInSearch(search: Record<string, unknown>): SignInSearch {
  const redirectUrl = search.redirect_url
  return typeof redirectUrl === 'string' && redirectUrl !== ''
    ? { redirect_url: redirectUrl }
    : {}
}

export function redirectSignedInUsers({
  context,
}: {
  context: {
    currentUserId: string | null
  }
}) {
  if (context.currentUserId !== null) {
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
