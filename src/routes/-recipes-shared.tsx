import * as React from "react";
import { m } from "@/paraglide/messages.js";

export function RecipesPageShell(props: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8 md:py-12">
      <div className="mx-auto max-w-4xl">{props.children}</div>
    </main>
  );
}

export function formatAmount(amount: number): string {
  const rounded = Math.round(amount * 1000) / 1000;
  return rounded.toString();
}

export function formatIngredientLine(amount: number, unit: string, name: string): string {
  if (unit === "") {
    return `${formatAmount(amount)} ${name}`;
  } else {
    return `${formatAmount(amount)} ${unit} ${name}`;
  }
}

export function parsePositiveNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  } else {
    return null;
  }
}

export function ErrorBanner(props: { message: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {props.message}
    </div>
  );
}

export function LoadingText() {
  return <p className="text-gray-600">{m.loading()}</p>;
}
