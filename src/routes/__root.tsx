/// <reference types="vite/client" />

import * as React from "react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import {
  ClerkProvider,
  useAuth,
  useUser,
} from "@clerk/tanstack-react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { z } from "zod";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { convexClient } from "../convex-client";
import "../styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title: "Taskologist — The science of your recurring tasks",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  beforeLoad: async () => {
    return {
      currentUserId: await getCurrentUserId(),
    };
  },
  component: RootComponent,
});

const getCurrentUserId = createServerFn({ method: "GET" }).handler(async () => {
  const { userId } = await auth();
  return userId;
});

function RootComponent() {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-gray-50">
        <ClerkProvider signInUrl="/sign-in">
          <PostHogProvider
            apiKey={getPostHogApiKey()}
            options={{ api_host: getPostHogHost(), defaults: "2026-01-30" }}
          >
            <PostHogUserSync />
            <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
              <QueryClientProvider client={queryClient}>
                <Outlet />
                {import.meta.env.DEV ? (
                  <ReactQueryDevtools initialIsOpen={false} />
                ) : null}
              </QueryClientProvider>
            </ConvexProviderWithClerk>
          </PostHogProvider>
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  );
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
