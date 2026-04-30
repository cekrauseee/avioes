import { Counter } from "./components/counter";
import { Onboarding } from "./components/onboarding";
import { AppShell } from "./components/app-shell";
import { readEvents, readIdentity, readTheme } from "./lib/cookies";
import { totals } from "./lib/streaks";

export default async function Page() {
  const [who, events, theme] = await Promise.all([
    readIdentity(),
    readEvents(),
    readTheme(),
  ]);

  if (!who) return <Onboarding />;

  const t = totals(events);
  const partner = who === "henrique" ? "pietra" : "henrique";

  return (
    <AppShell theme={theme}>
      <Counter
        who={who}
        myCount={t[who]}
        partnerCount={t[partner]}
        total={events.length}
        canUndo={events.length > 0}
      />
    </AppShell>
  );
}
