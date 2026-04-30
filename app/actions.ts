"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  deleteIdentity,
  readEvents,
  readIdentity,
  writeEvents,
  writeIdentity,
  writeTheme,
} from "./lib/cookies";
import type { Identity, Theme } from "./lib/types";

export async function setIdentity(who: Identity) {
  if (who !== "henrique" && who !== "pietra") return;
  await writeIdentity(who);
  redirect("/");
}

export async function clearIdentity() {
  await deleteIdentity();
  redirect("/");
}

export async function addAirplane() {
  const who = await readIdentity();
  if (!who) return;
  const events = await readEvents();
  events.push({ who, ts: Date.now() });
  await writeEvents(events);
  revalidatePath("/");
  revalidatePath("/diario");
  revalidatePath("/placar");
}

export async function undoLast() {
  const events = await readEvents();
  events.pop();
  await writeEvents(events);
  revalidatePath("/");
  revalidatePath("/diario");
  revalidatePath("/placar");
}

export async function setTheme(theme: Theme) {
  if (theme !== "light" && theme !== "dark" && theme !== "system") return;
  await writeTheme(theme);
  revalidatePath("/", "layout");
}
