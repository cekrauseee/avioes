"use client";

import { motion } from "motion/react";
import { useTransition } from "react";
import { setIdentity } from "../actions";
import { Placeholder } from "./placeholder";
import type { Identity } from "../lib/types";

export function Onboarding() {
  const [pending, start] = useTransition();

  const pick = (who: Identity) => start(() => setIdentity(who));

  return (
    <main className="relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-baseline justify-between"
      >
        <span className="text-xs text-ink-faint">
          aviões · 001
        </span>
        <span className="text-xs text-ink-faint">
          {new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "short",
          }).format(new Date())}
        </span>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8"
      >
        <h1 className="font-display text-[34px] leading-[0.95] tracking-tight">
          Quem está
          <br />
          <span className="italic text-clay">olhando</span> o céu?
        </h1>
        <p className="mt-3 max-w-[28ch] font-display text-sm text-ink-soft">
          Antes de contar aviões, conta pra gente quem é você.
        </p>
      </motion.div>

      <div className="mt-auto grid grid-cols-2 gap-2.5">
        <PersonCard
          who="henrique"
          label="Henrique"
          accent="sage"
          delay={0.2}
          onPick={pick}
          pending={pending}
        />
        <PersonCard
          who="pietra"
          label="Pietra"
          accent="clay"
          delay={0.3}
          onPick={pick}
          pending={pending}
        />
      </div>

      <p className="mt-4 text-center text-xs text-ink-faint">
        salvo neste dispositivo · sem login
      </p>
    </main>
  );
}

function PersonCard({
  who,
  label,
  accent,
  delay,
  onPick,
  pending,
}: {
  who: Identity;
  label: string;
  accent: "sage" | "clay";
  delay: number;
  onPick: (w: Identity) => void;
  pending: boolean;
}) {
  const ring = accent === "sage" ? "hover:bg-sage-soft" : "hover:bg-clay-soft";
  const textClass = accent === "sage" ? "text-sage" : "text-clay";
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.97 }}
      disabled={pending}
      onClick={() => onPick(who)}
      className={`group flex flex-col gap-2.5 rounded-xl border border-line bg-paper p-2.5 text-left transition-colors ${ring} disabled:opacity-50`}
    >
      <Placeholder ratio="4 / 5" tone={accent} label={who} />
      <div className="flex items-baseline justify-between px-0.5 pb-0.5">
        <span className={`font-display text-xl ${textClass}`}>{label}</span>
        <span className="text-xs text-ink-faint">
          sou eu →
        </span>
      </div>
    </motion.button>
  );
}
