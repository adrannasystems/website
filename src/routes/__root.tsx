/// <reference types="vite/client" />

import * as React from "react";
import { Outlet, createRootRoute, useNavigate } from "@tanstack/react-router";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import { z } from "zod";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { OneSignalSync } from "../components/OneSignalSync";
import { convexClient } from "../convex-client";
import { LocaleProvider } from "../locale";
import "../styles.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const navigate = useNavigate();

  return (
    <LocaleProvider>
      <ClerkProvider
        publishableKey={getClerkPublishableKey()}
        signInUrl="/sign-in"
        routerPush={(to) => {
          void navigate({ href: to });
        }}
        routerReplace={(to) => {
          void navigate({ href: to, replace: true });
        }}
      >
        <PostHogProvider
          apiKey={getPostHogApiKey()}
          options={{ api_host: getPostHogHost(), defaults: "2026-01-30" }}
        >
          <PostHogUserSync />
          <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
            <OneSignalSync />
            <Outlet />
          </ConvexProviderWithClerk>
        </PostHogProvider>
      </ClerkProvider>
    </LocaleProvider>
  );
}

function getClerkPublishableKey() {
  const key = "VITE_CLERK_PUBLISHABLE_KEY";
  return z
    .string({ message: `${key} is required` })
    .nonempty()
    .parse(import.meta.env[key]);
}

function getPostHogApiKey() {
  const key = "VITE_PUBLIC_POSTHOG_KEY";
  return z
    .string({ message: `${key} is required` })
    .nonempty()
    .parse(import.meta.env[key]);
}

function getPostHogHost() {
  const key = "VITE_PUBLIC_POSTHOG_HOST";
  return z
    .string({ message: `${key} is required` })
    .nonempty()
    .parse(import.meta.env[key]);
}

function PostHogUserSync() {
  const { isLoaded, user } = useUser();
  const posthog = usePostHog();

  React.useEffect(() => {
    if (isLoaded) {
      if (user !== null) {
        posthog.identify(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName ?? undefined,
        });
      } else {
        posthog.reset();
      }
    }
  }, [isLoaded, posthog, user]);

  return null;
}
