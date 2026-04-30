import { cookies } from "next/headers";
import type { AirplaneEvent, Identity, Theme } from "./types";

const ID_COOKIE = "av_id";
const EVENTS_COOKIE = "av_events";
const THEME_COOKIE = "av_theme";
const ONE_YEAR = 60 * 60 * 24 * 365;
const MAX_EVENTS = 1000;

export async function readIdentity(): Promise<Identity | null> {
  const v = (await cookies()).get(ID_COOKIE)?.value;
  return v === "henrique" || v === "pietra" ? v : null;
}

export async function writeIdentity(who: Identity) {
  (await cookies()).set(ID_COOKIE, who, {
    maxAge: ONE_YEAR,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteIdentity() {
  (await cookies()).delete(ID_COOKIE);
}

export async function readEvents(): Promise<AirplaneEvent[]> {
  const raw = (await cookies()).get(EVENTS_COOKIE)?.value;
  return parseEvents(raw);
}

export async function writeEvents(events: AirplaneEvent[]) {
  const trimmed = events.slice(-MAX_EVENTS);
  (await cookies()).set(EVENTS_COOKIE, serializeEvents(trimmed), {
    maxAge: ONE_YEAR,
    sameSite: "lax",
    path: "/",
  });
}

export async function readTheme(): Promise<Theme> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return v === "light" || v === "dark" ? v : "system";
}

export async function writeTheme(theme: Theme) {
  (await cookies()).set(THEME_COOKIE, theme, {
    maxAge: ONE_YEAR,
    sameSite: "lax",
    path: "/",
  });
}

function parseEvents(raw: string | undefined): AirplaneEvent[] {
  if (!raw) return [];
  // Legacy format used comma+colon separators (technically invalid per RFC 6265,
  // causing %2C/%3A encoding and ~200-event cap). New format uses pipe-separated
  // compact records: single identity char + base36 timestamp, no encoding needed.
  const isLegacy = raw.includes(":");
  return raw
    .split(isLegacy ? "," : "|")
    .map((p) => {
      const who: Identity | null =
        p[0] === "h" ? "henrique" : p[0] === "p" ? "pietra" : null;
      const ts = isLegacy ? Number(p.slice(2)) : parseInt(p.slice(1), 36);
      if (!who || !Number.isFinite(ts)) return null;
      return { who, ts };
    })
    .filter((e): e is AirplaneEvent => e !== null);
}

function serializeEvents(events: AirplaneEvent[]): string {
  return events
    .map((e) => `${e.who[0]}${e.ts.toString(36)}`)
    .join("|");
}
