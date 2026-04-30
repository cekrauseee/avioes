import { redirect } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { Placeholder } from "../components/placeholder";
import { readEvents, readIdentity, readTheme } from "../lib/cookies";
import { computeStreaks, totals } from "../lib/streaks";
import { IDENTITIES, type Identity } from "../lib/types";

export default async function PlacarPage() {
  const [who, events, theme] = await Promise.all([
    readIdentity(),
    readEvents(),
    readTheme(),
  ]);

  if (!who) redirect("/");

  const t = totals(events);
  const streaks = computeStreaks(events);
  const longest = streaks.reduce<{ henrique: number; pietra: number }>(
    (acc, s) => {
      if (s.count > acc[s.who]) acc[s.who] = s.count;
      return acc;
    },
    { henrique: 0, pietra: 0 },
  );
  const leader: Identity | null =
    t.henrique === t.pietra ? null : t.henrique > t.pietra ? "henrique" : "pietra";

  return (
    <AppShell theme={theme} scroll>
      <main className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-8">
        <header className="flex items-baseline justify-between">
          <h1 className="font-display text-3xl tracking-tight">Placar</h1>
          <span className="text-xs text-ink-faint">
            {events.length} no total
          </span>
        </header>
        <p className="mt-1 font-display text-sm italic text-ink-soft">
          {leader
            ? `${IDENTITIES[leader].label} está na frente.`
            : "Empate técnico no céu."}
        </p>

        <section className="relative mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Score
            id="henrique"
            count={t.henrique}
            longest={longest.henrique}
            highlight={leader === "henrique"}
            align="left"
          />
          <span className="font-display text-2xl italic text-ink-faint rotate-[-8deg]">
            vs
          </span>
          <Score
            id="pietra"
            count={t.pietra}
            longest={longest.pietra}
            highlight={leader === "pietra"}
            align="right"
          />
        </section>

        <section className="mt-8">
          <h2 className="text-xs text-ink-faint">
            últimas sequências
          </h2>
          <ul className="mt-2 divide-y divide-line border-t border-b border-line">
            {streaks.length === 0 && (
              <li className="py-3 font-display text-sm text-ink-soft">
                Nada por aqui ainda.
              </li>
            )}
            {streaks
              .slice(-8)
              .reverse()
              .map((s, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between py-2.5"
                >
                  <span className="font-display text-sm">
                    <span className={IDENTITIES[s.who].text}>
                      {IDENTITIES[s.who].label}
                    </span>{" "}
                    · {s.count}
                  </span>
                  <span className="font-mono text-[11px] text-ink-faint">
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(s.endTs))}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </main>
    </AppShell>
  );
}

function Score({
  id,
  count,
  longest,
  highlight,
  align,
}: {
  id: Identity;
  count: number;
  longest: number;
  highlight: boolean;
  align: "left" | "right";
}) {
  const tone = id === "henrique" ? "sage" : "clay";
  return (
    <div
      className={`flex flex-col gap-2 ${align === "right" ? "items-end text-right" : "items-start text-left"}`}
    >
      <Placeholder
        ratio="1 / 1"
        tone={tone}
        label={IDENTITIES[id].label.toLowerCase()}
        className="w-14"
      />
      <span className="text-xs text-ink-faint">
        {IDENTITIES[id].label}
      </span>
      <span
        className={`font-display text-[44px] leading-none tracking-tight ${highlight ? IDENTITIES[id].text : "text-ink"}`}
      >
        {count}
      </span>
      <span className="text-xs text-ink-faint">
        maior · {longest}
      </span>
    </div>
  );
}
