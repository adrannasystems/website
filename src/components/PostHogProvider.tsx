import * as React from "react";
import { z } from "zod";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useRouterState } from "@tanstack/react-router";
import { useUser } from "@clerk/tanstack-react-start";

function PageviewTracker() {
  const location = useRouterState({ select: (s) => s.location });

  React.useEffect(() => {
    posthog.capture("$pageview");
  }, [location.href]);

  return null;
}

function UserIdentifier() {
  const { user } = useUser();

  React.useEffect(() => {
    if (user !== null && user !== undefined) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
      });
    } else {
      posthog.reset();
    }
  }, [user]);

  return null;
}

export function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    const POSTHOG_KEY = "VITE_PUBLIC_POSTHOG_KEY";
    const POSTHOG_HOST = "VITE_PUBLIC_POSTHOG_HOST";

    posthog.init(
      z
        .string({ message: `${POSTHOG_KEY} is required` })
        .nonempty()
        .parse(import.meta.env[POSTHOG_KEY]),
      {
        api_host: z
          .string({ message: `${POSTHOG_HOST} is required` })
          .nonempty()
          .parse(import.meta.env[POSTHOG_HOST]),
        capture_pageview: false,
        capture_pageleave: true,
      },
    );
    setInitialized(true);
  }, []);

  if (!initialized) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <PageviewTracker />
      <UserIdentifier />
      {children}
    </PHProvider>
  );
}
