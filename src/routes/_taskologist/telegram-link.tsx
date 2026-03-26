import * as React from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_taskologist/telegram-link")({
  beforeLoad: ({ context }) => {
    if (context.currentUserId === null) {
      throw redirect({ to: "/sign-in", search: { redirect_url: "/telegram-link" } });
    }
  },
  component: TelegramLinkPage,
});

function TelegramLinkPage() {
  return (
    <>
      <AuthLoading>
        <TelegramLinkPageLoading />
      </AuthLoading>
      <Authenticated>
        <TelegramLinkPageContent />
      </Authenticated>
      <Unauthenticated>
        <TelegramLinkPageLoading />
      </Unauthenticated>
    </>
  );
}

function TelegramLinkPageContent() {
  const generateToken = useMutation(api.maintenanceTasks.generateTelegramLinkToken);
  const [token, setToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    generateToken({})
      .then((t) => {
        if (!cancelled) setToken(t);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to generate link code. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [generateToken]);

  const handleRegenerate = React.useCallback(async () => {
    setError(null);
    try {
      const t = await generateToken({});
      setToken(t);
    } catch {
      setError("Unable to generate link code. Please try again.");
    }
  }, [generateToken]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-20">
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">Link Telegram</h1>
        <p className="mb-8 text-sm text-gray-500">
          Send the code below to the Taskologist bot to link this account.
        </p>

        {error !== null ? (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        {token === null && error === null ? (
          <div className="text-sm text-gray-500">Generating code...</div>
        ) : token !== null ? (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <code className="rounded bg-gray-100 px-4 py-3 font-mono text-3xl tracking-widest text-gray-900">
                {token}
              </code>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              In Telegram, send: <code className="font-mono">/link {token}</code>
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(`/link ${token}`);
                }}
              >
                Copy command
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleRegenerate()}>
                Generate new code
              </Button>
            </div>
            <p className="mt-4 text-xs text-gray-400">Valid for 15 minutes.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function TelegramLinkPageLoading() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-20">
      <div className="mx-auto max-w-md">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    </main>
  );
}
