"use client";

import { motion, AnimatePresence } from "motion/react";

export type ArcKey = { id: number; from: "left" | "right" };

export function PlaneArc({ flights }: { flights: ArcKey[] }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <AnimatePresence>
        {flights.map((f) => {
          const reverse = f.from === "right";
          return (
            <motion.div
              key={f.id}
              initial={{
                x: reverse ? "110vw" : "-15vw",
                y: reverse ? "20vh" : "60vh",
                rotate: reverse ? 200 : 20,
                opacity: 0,
              }}
              animate={{
                x: reverse ? "-15vw" : "110vw",
                y: reverse ? "60vh" : "20vh",
                rotate: reverse ? 200 : 20,
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 1.6,
                ease: [0.4, 0, 0.6, 1],
                opacity: { times: [0, 0.15, 0.85, 1], duration: 1.6 },
              }}
              className="absolute font-display text-3xl text-ink/70"
            >
              ✈
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
