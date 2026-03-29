import * as React from "react";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { AuthButtons, MobileMenuButton } from "./-header-shared";

export const Route = createFileRoute("/_taskologist")({
  component: TaskologistLayout,
});

function TaskologistLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <>
      <header className="fixed z-10 w-full bg-white shadow-sm">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="text-2xl font-bold text-gray-800">
              Taskologist
            </Link>
            <div className="flex items-center gap-3">
              <div className="md:hidden">
                <SignedOut>
                  <AuthButtons size="sm" />
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
              <MobileMenuButton
                isMobileMenuOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen((v) => !v)}
              />
            </div>
            <div className="hidden items-center gap-8 md:flex">
              <SignedOut>
                <AuthButtons />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </div>
          {isMobileMenuOpen ? (
            <div id="mobile-navigation" className="mt-4 border-t border-gray-200 pt-4 md:hidden" />
          ) : null}
        </nav>
      </header>
      <div className="pt-16">
        <Outlet />
      </div>
    </>
  );
}
