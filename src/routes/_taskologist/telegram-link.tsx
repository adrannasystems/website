import * as React from "react";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated, useMutation } from "convex/react";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";

const searchSchema = z.object({
  chat: z.coerce.string().optional(),
});

export const Route = createFileRoute("/_taskologist/telegram-link")({
  validateSearch: searchSchema,
  component: TelegramLinkPage,
});

function TelegramLinkPage() {
  const location = useLocation();

  return (
    <>
      <AuthLoading>
        <TelegramLinkShell>Loading...</TelegramLinkShell>
      </AuthLoading>
      <Authenticated>
        <TelegramLinkContent />
      </Authenticated>
      <Unauthenticated>
        <RedirectToSignIn redirectUrl={location.href} />
      </Unauthenticated>
    </>
  );
}

function RedirectToSignIn(props: { redirectUrl: string }) {
  const navigate = Route.useNavigate();

  React.useEffect(() => {
    void navigate({
      to: "/sign-in",
      search: { redirect_url: props.redirectUrl },
    });
  }, [navigate, props.redirectUrl]);

  return <TelegramLinkShell>Loading...</TelegramLinkShell>;
}

function TelegramLinkContent() {
  const { chat: chatId } = Route.useSearch();
  const linkChat = useMutation(api.telegram.users.linkChat);
  const [status, setStatus] = React.useState<"pending" | "linked" | "error">("pending");

  React.useEffect(() => {
    if (chatId === undefined) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    linkChat({ chatId })
      .then(() => {
        if (!cancelled) setStatus("linked");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [chatId, linkChat]);

  if (status === "linked") {
    return (
      <TelegramLinkShell>
        <p className="text-lg font-medium text-gray-900">Linked.</p>
        <p className="text-sm text-gray-500">You can close this.</p>
      </TelegramLinkShell>
    );
  } else if (status === "error") {
    return (
      <TelegramLinkShell>
        <p className="text-sm text-red-600">
          {chatId === undefined
            ? "No chat ID provided. Open this link from the Telegram bot."
            : "Something went wrong. Please try again from the bot."}
        </p>
      </TelegramLinkShell>
    );
  } else {
    return <TelegramLinkShell>Linking...</TelegramLinkShell>;
  }
}

function TelegramLinkShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="text-center">{children}</div>
    </main>
  );
}
