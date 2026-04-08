import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { useLocale } from "@/locale";
import * as m from "@/paraglide/messages.js";

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
