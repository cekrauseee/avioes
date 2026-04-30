"use client";

import { motion, useSpring, useTransform } from "motion/react";
import { useEffect, useOptimistic, useState, startTransition } from "react";
import { addAirplane, clearIdentity, undoLast } from "../actions";
import { IDENTITIES, type Identity } from "../lib/types";
import { PlaneArc, type ArcKey } from "./plane-arc";

type Props = {
  who: Identity;
  myCount: number;
  partnerCount: number;
  total: number;
  canUndo: boolean;
};

export function Counter({ who, myCount, partnerCount, total, canUndo }: Props) {
  const me = IDENTITIES[who];
  const partner = who === "henrique" ? "pietra" : "henrique";
  const partnerName = IDENTITIES[partner].label;
  const myName = me.label;

  const [optimistic, applyDelta] = useOptimistic(
    myCount,
    (state: number, delta: number) => Math.max(0, state + delta),
  );
  const [optTotal, applyTotalDelta] = useOptimistic(
    total,
    (state: number, delta: number) => Math.max(0, state + delta),
  );
  const [flights, setFlights] = useState<ArcKey[]>([]);

  const spring = useSpring(optimistic, { stiffness: 220, damping: 22 });
  useEffect(() => {
    spring.set(optimistic);
  }, [optimistic, spring]);
  const display = useTransform(spring, (v) => Math.round(v).toString());

  const tap = () => {
    setFlights((f) => [
      ...f.slice(-2),
      { id: Date.now(), from: Math.random() > 0.5 ? "left" : "right" },
    ]);
    startTransition(async () => {
      applyDelta(1);
      applyTotalDelta(1);
      await addAirplane();
    });
  };

  const undo = () => {
    startTransition(async () => {
      applyDelta(-1);
      applyTotalDelta(-1);
      await undoLast();
    });
  };

  return (
    <main className="relative flex h-full w-full flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]">
      <PlaneArc flights={flights} />

      <header className="relative z-10 flex items-baseline justify-between">
        <button
          type="button"
          onClick={() => startTransition(() => clearIdentity())}
          className="flex items-center gap-2"
        >
          <span
            className={`h-2 w-2 rounded-full ${me.bg}`}
            aria-hidden
          />
          <span className="font-display text-sm">{myName}</span>
          <span className="text-xs text-ink-faint">
            trocar
          </span>
        </button>
        <span className="text-xs text-ink-faint">
          {optTotal} no total
        </span>
      </header>

      <button
        type="button"
        onClick={tap}
        className="relative z-10 mt-4 flex flex-1 select-none flex-col items-end justify-center text-right active:scale-[0.99] transition-transform"
        aria-label="Vi um avião"
      >
        <span className="text-xs text-ink-faint">
          toque · vi um avião
        </span>
        <motion.span className="font-display text-[clamp(96px,32vw,150px)] leading-[0.85] tracking-tight">
          {display}
        </motion.span>
        <span className="-mt-1 font-display text-base italic text-ink-soft">
          {optimistic === 1 ? "avião" : "aviões"} {myName.toLowerCase()}
        </span>
      </button>

      <footer className="relative z-10 mt-4 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-ink-faint">
            {partnerName}
          </span>
          <span className="font-display text-xl text-ink-soft">
            {partnerCount}
          </span>
        </div>
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="text-xs text-ink-soft underline decoration-dotted underline-offset-4 disabled:opacity-30"
        >
          desfazer
        </button>
      </footer>
    </main>
  );
}
