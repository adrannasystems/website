import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { UserButton } from "@clerk/clerk-react";
import { AuthButtons, LanguageSwitcher } from "./-header-shared";
import { useLocale } from "@/locale";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

export const Route = createFileRoute("/_taskologist")({
  component: TaskologistLayout,
});

function TaskologistLayout() {
  const { locale } = useLocale();

  return (
    <>
      <header className="fixed z-10 w-full bg-white shadow-sm" lang={locale}>
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="text-2xl font-bold text-gray-800">
              Taskologist
            </Link>
            <div className="flex items-center gap-3 md:gap-4">
              <LanguageSwitcher />
              <AuthLoading>
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
              </AuthLoading>
              <Authenticated>
                <UserButton />
              </Authenticated>
              <Unauthenticated>
                <AuthButtons />
              </Unauthenticated>
            </div>
          </div>
        </nav>
      </header>
      <div className="pt-16">
        <Outlet />
      </div>
    </>
  );
}
