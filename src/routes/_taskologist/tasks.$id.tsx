import * as React from "react";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

export const Route = createFileRoute("/_taskologist/tasks/$id")({
  component: TaskDeepLinkPage,
});

function TaskDeepLinkPage() {
  return (
    <>
      <AuthLoading>
        <LoadingShell />
      </AuthLoading>
      <Authenticated>
        <RedirectToTask />
      </Authenticated>
      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>
    </>
  );
}

function RedirectToTask() {
  const { id } = Route.useParams();
  const navigate = Route.useNavigate();

  React.useEffect(() => {
    void navigate({ to: "/", search: { task: id }, replace: true });
  }, [navigate, id]);

  return <LoadingShell />;
}

function RedirectToSignIn() {
  const location = useLocation();
  const navigate = Route.useNavigate();

  React.useEffect(() => {
    void navigate({
      to: "/sign-in",
      search: { redirect_url: location.href },
    });
  }, [navigate, location.href]);

  return <LoadingShell />;
}

function LoadingShell() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center text-sm text-gray-500">Loading...</div>
    </main>
  );
}
