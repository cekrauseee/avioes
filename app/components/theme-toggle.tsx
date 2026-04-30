"use client";

import { useTransition } from "react";
import { setTheme } from "../actions";
import type { Theme } from "../lib/types";

const order: Theme[] = ["system", "light", "dark"];
const labels: Record<Theme, string> = {
  system: "auto",
  light: "claro",
  dark: "escuro",
};

export function ThemeToggle({ theme }: { theme: Theme }) {
  const [pending, start] = useTransition();
  const next = order[(order.indexOf(theme) + 1) % order.length];
  return (
    <button
      type="button"
      onClick={() => start(() => setTheme(next))}
      disabled={pending}
      className="text-xs text-ink-soft hover:text-ink transition-colors"
      aria-label={`Tema: ${labels[theme]}, clique para mudar`}
    >
      <span className="opacity-50">tema · </span>
      <span className="underline underline-offset-4 decoration-dotted">
        {labels[theme]}
      </span>
    </button>
  );
}
