import * as React from "react";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Globe } from "lucide-react";
import { useLocale, SUPPORTED_LOCALES } from "@/locale";
import { objectEntries } from "@/object-helpers";
import { m } from "@/paraglide/messages.js";

export function AuthButtons(props: { size?: "sm" }) {
  const { locale } = useLocale();
  const cls =
    props.size === "sm"
      ? {
          signIn:
            "cursor-pointer border-0 bg-transparent p-0 text-sm font-medium text-gray-600 hover:text-gray-900",
          signUp:
            "cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700",
        }
      : {
          signIn:
            "cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-gray-600 hover:text-gray-900",
          signUp:
            "cursor-pointer rounded-lg bg-blue-600 px-4 py-2 font-[inherit] text-white hover:bg-blue-700",
        };

  return (
    <div className="flex items-center gap-4" lang={locale}>
      <SignInButton>
        <button type="button" className={cls.signIn}>
          {m.signIn()}
        </button>
      </SignInButton>
      <SignUpButton>
        <button type="button" className={cls.signUp}>
          {m.signUp()}
        </button>
      </SignUpButton>
    </div>
  );
}

export function MobileMenuButton(props: { isMobileMenuOpen: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="inline-flex items-center justify-center rounded-md border border-gray-300 p-2 text-gray-700 md:hidden"
      aria-expanded={props.isMobileMenuOpen}
      aria-controls="mobile-navigation"
      aria-label="Toggle menu"
    >
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-5 w-5"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

export function LanguageSwitcher() {
  const { locale, changeLocale } = useLocale();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handleClickOutside(event: MouseEvent) {
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
