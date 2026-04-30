import { redirect } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { readEvents, readIdentity, readTheme } from "../lib/cookies";
import { computeStreaks } from "../lib/streaks";
import { IDENTITIES } from "../lib/types";

const dayFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
});
const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

export default async function DiarioPage() {
  const [who, events, theme] = await Promise.all([
    readIdentity(),
    readEvents(),
    readTheme(),
  ]);

  if (!who) redirect("/");

  const streaks = computeStreaks(events).reverse();

  return (
    <AppShell theme={theme} scroll>
      <main className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-8">
        <header className="flex items-baseline justify-between">
          <h1 className="font-display text-3xl tracking-tight">Diário</h1>
          <span className="text-xs text-ink-faint">
            {events.length} aviões
          </span>
        </header>
        <p className="mt-1 font-display text-sm italic text-ink-soft">
          O céu da gente, em ordem.
        </p>

        {streaks.length === 0 ? (
          <Empty />
        ) : (
          <ol className="relative mt-7 space-y-4 pl-5">
            <span
              aria-hidden
              className="absolute left-[5px] top-2 bottom-2 w-px dotted-line"
            />
            {streaks.map((s, i) => (
              <li key={i} className="relative">
                <span
                  aria-hidden
                  className={`absolute -left-[18px] top-2 h-2 w-2 rounded-full ${IDENTITIES[s.who].bg}`}
                />
                <article
                  className={`rounded-xl border border-line bg-paper p-3 ${
                    i % 2 === 0 ? "rotate-[-0.3deg]" : "rotate-[0.3deg]"
                  }`}
                >
                  <p className="font-display text-base leading-snug">
                    <span className={IDENTITIES[s.who].text}>
                      {IDENTITIES[s.who].label}
                    </span>{" "}
                    viu{" "}
                    <span className="font-mono text-sm">{s.count}</span>{" "}
                    {s.count === 1 ? "avião" : "aviões em sequência"}.
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-ink-faint">
                    {dayFmt.format(new Date(s.startTs))} ·{" "}
                    {timeFmt.format(new Date(s.startTs))}
                    {s.count > 1
                      ? ` – ${timeFmt.format(new Date(s.endTs))}`
                      : ""}
                  </p>
                </article>
              </li>
            ))}
          </ol>
        )}
      </main>
    </AppShell>
  );
}

function Empty() {
  return (
    <div className="mt-12 rounded-xl border border-dashed border-line p-6 text-center">
      <p className="font-display text-base text-ink-soft">
        Nenhum avião ainda.
      </p>
      <p className="mt-1.5 text-xs text-ink-faint">
        toque na tela inicial pra começar
      </p>
    </div>
  );
}
