import { createFileRoute } from '@tanstack/react-router'
import {
  SignInRoutePage,
  redirectSignedInUsers,
  validateSignInSearch,
} from './-sign-in-shared'

export const Route = createFileRoute('/sign-in')({
  validateSearch: validateSignInSearch,
  beforeLoad: redirectSignedInUsers,
  component: SignInPage,
})

function SignInPage() {
  const search = Route.useSearch()

  return search.redirect_url === undefined
    ? <SignInRoutePage />
    : <SignInRoutePage redirectUrl={search.redirect_url} />
}
