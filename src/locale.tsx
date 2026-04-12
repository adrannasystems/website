import * as React from "react";
import { setLocale as setParaglideLocale } from "@/paraglide/runtime.js";
import { objectKeys } from "./object-helpers";

export const SUPPORTED_LOCALES = {
  "de-CH": "Deutsch",
  en: "English",
  "fr-CH": "Français",
  "it-CH": "Italiano",
} as const satisfies Record<string, string>;

export type Locale = keyof typeof SUPPORTED_LOCALES;

const LocaleContext = React.createContext<{
  locale: Locale;
  changeLocale: (locale: Locale) => void;
} | null>(null);
LocaleContext.displayName = "LocaleContext";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = React.useState<Locale>(() => {
    const initial = detectInitialLocale();
    void setParaglideLocale(initial);
    return initial;
  });

  const changeLocale = React.useCallback((newLocale: Locale) => {
    localStorage.setItem(STORAGE_KEY, newLocale);
    void setParaglideLocale(newLocale, { reload: false });
    setLocale(newLocale);
  }, []);

  const contextValue = React.useMemo(() => ({ locale, changeLocale }), [changeLocale, locale]);

  return <LocaleContext value={contextValue}>{children}</LocaleContext>;
}

export function useLocale() {
  const ctx = React.use(LocaleContext);
  if (ctx === null) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

const STORAGE_KEY = "locale";

function detectInitialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null && isLocale(stored)) {
    return stored;
  }
  for (const lang of navigator.languages) {
    if (isLocale(lang)) {
      return lang;
    }
    const base = lang.split("-")[0];
    if (base !== undefined) {
      const match = objectKeys(SUPPORTED_LOCALES).find((l) => l.startsWith(base));
      if (match !== undefined) {
        return match;
      }
    }
  }
  return "en";
}

function isLocale(value: string): value is keyof typeof SUPPORTED_LOCALES {
  return value in SUPPORTED_LOCALES;
}
