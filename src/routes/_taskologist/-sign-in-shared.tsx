import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { SignIn, useAuth } from "@clerk/clerk-react";

export type SignInSearch = { redirect_url?: string };

export function validateSignInSearch(search: Record<string, unknown>): SignInSearch {
  const redirectUrl = search["redirect_url"];
  return typeof redirectUrl === "string" && redirectUrl !== "" ? { redirect_url: redirectUrl } : {};
}

export function SignInRoutePage(props: { redirectUrl?: string }) {
  const fallbackRedirectUrl = props.redirectUrl ?? "/";
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      void navigate({ href: fallbackRedirectUrl });
    }
  }, [isLoaded, isSignedIn, navigate, fallbackRedirectUrl]);

  if (!isLoaded || isSignedIn) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-20">
      <SignIn path="/sign-in" routing="path" fallbackRedirectUrl={fallbackRedirectUrl} />
    </main>
  );
}
