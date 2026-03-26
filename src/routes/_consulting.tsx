import * as React from "react";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@clerk/tanstack-react-start";
import { AuthButtons, MobileMenuButton } from "./-header-shared";

export const Route = createFileRoute("/_consulting")({
  component: ConsultingLayout,
});

function ConsultingLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="fixed z-10 w-full bg-white shadow-sm">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link to="/consulting" className="text-2xl font-bold text-gray-800">
              Adranna Systems
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
              <Link to="/consulting" hash="services" className="text-gray-600 hover:text-gray-900">
                Services
              </Link>
              <Link to="/consulting" hash="about" className="text-gray-600 hover:text-gray-900">
                About
              </Link>
              <Link to="/consulting" hash="contact" className="text-gray-600 hover:text-gray-900">
                Contact
              </Link>
              <SignedOut>
                <AuthButtons />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </div>
          {isMobileMenuOpen ? (
            <div id="mobile-navigation" className="mt-4 border-t border-gray-200 pt-4 md:hidden">
              <div className="flex flex-col gap-3">
                <Link
                  to="/consulting"
                  hash="services"
                  className="text-gray-600 hover:text-gray-900"
                  onClick={closeMobileMenu}
                >
                  Services
                </Link>
                <Link
                  to="/consulting"
                  hash="about"
                  className="text-gray-600 hover:text-gray-900"
                  onClick={closeMobileMenu}
                >
                  About
                </Link>
                <Link
                  to="/consulting"
                  hash="contact"
                  className="text-gray-600 hover:text-gray-900"
                  onClick={closeMobileMenu}
                >
                  Contact
                </Link>
              </div>
            </div>
          ) : null}
        </nav>
      </header>
      <div className="pt-16">
        <Outlet />
      </div>
    </>
  );
}
