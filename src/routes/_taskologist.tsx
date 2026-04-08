import * as React from "react";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { UserButton } from "@clerk/clerk-react";
import { Globe } from "lucide-react";
import { AuthButtons } from "./-header-shared";
import { useLocale, SUPPORTED_LOCALES } from "@/locale";
import * as m from "@/paraglide/messages.js";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { objectEntries } from "@/object-helpers";

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

function LanguageSwitcher() {
  const { locale, changeLocale } = useLocale();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handleClickOutside(event: MouseEvent) {
      // event.target is EventTarget | null; contains() requires Node | null.
      // MouseEvent targets on DOM elements are always Nodes, so this cast is safe.
      if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        aria-label={m.changeLanguage()}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="h-5 w-5" />
      </button>
      {isOpen ? (
        <div
          role="listbox"
          aria-label={m.changeLanguage()}
          className="absolute right-0 z-50 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {objectEntries(SUPPORTED_LOCALES).map(([key, name]) => (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={locale === key}
              onClick={() => {
                changeLocale(key);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="w-4 text-xs">{locale === key ? "✓" : ""}</span>
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
