import { createFileRoute } from "@tanstack/react-router";
import { SignInRoutePage, validateSignInSearch } from "./-sign-in-shared";

export const Route = createFileRoute("/_taskologist/sign-in/$")({
  validateSearch: validateSignInSearch,
  component: SignInNestedPathPage,
});

function SignInNestedPathPage() {
  const search = Route.useSearch();

  return search.redirect_url === undefined ? (
    <SignInRoutePage />
  ) : (
    <SignInRoutePage redirectUrl={search.redirect_url} />
  );
}
