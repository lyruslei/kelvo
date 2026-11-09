"use server";
import Anthropic from "@anthropic-ai/sdk";
import { isLoggedIn } from "@/lib/session";
import { askCoach } from "@/lib/coach";
import { niceDate, parseDay, todayIn } from "@/lib/days";
import { deleteEntries, describeDay, loadDay, loadHistory, loadLibrary, loadRecentLog, moveEntries, saveTurn } from "@/lib/store";
import { describePlan, suggestNext } from "@/lib/schedule";
import { normalizeTurn } from "@/lib/turn";

export type ChatResult = { ok: true; reply: string } | { ok: false; error: string };
export type EditResult = { ok: true } | { ok: false; error: string };

const MAX_TEXT = 2000;
const label = (d: string) => `${niceDate(d)} (${d})`;

// `viewedDay` is the day on screen: today, or an earlier day you're filling in.
export async function sendMessage(text: string, viewedDay?: string): Promise<ChatResult> {
  if (!(await isLoggedIn())) return { ok: false, error: "Your session ended. Log in again." };
  const msg = typeof text === "string" ? text.trim() : "";
  if (!msg) return { ok: false, error: "Type what you did first." };
  if (msg.length > MAX_TEXT) return { ok: false, error: `Keep it under ${MAX_TEXT} characters.` };

  const today = todayIn();
  const day = viewedDay === undefined ? today : parseDay(viewedDay, today);
  if (!day) return { ok: false, error: "You can only log to today or the past year." };
  try {
    const [library, logged, history, recentLog] = await Promise.all([loadLibrary(), loadDay(day), loadHistory(today), loadRecentLog(day)]);
    const raw = await askCoach({
      text: msg,
      today: label(today),
      day: label(day),
      libraryNames: [...library.keys()],
      dayLog: describeDay(logged.sets, logged.cardio),
      recentLog,
      plan: describePlan(suggestNext(today, history), today),
      history: logged.messages.slice(-20),
    });
    const turn = normalizeTurn(raw, library, {
      sets: new Set(logged.sets.map((s) => s.id)),
      cardio: new Set(logged.cardio.map((c) => c.id)),
    });

    // "Yesterday I..." goes to that day, if it's a day you're allowed to log to.
    let entryDay = day;
    if (turn.logDay && turn.logDay !== day) {
      const d = parseDay(turn.logDay, today);
      if (!d) return { ok: false, error: "You can only log to today or the past year." };
      entryDay = d;
    }
    await saveTurn(day, entryDay, turn, msg);
    return { ok: true, reply: turn.reply };
  } catch (err) {
    console.error("chat failed:", err);
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "Too many messages at once. Try again in a minute." };
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, error: "The Claude API key isn't working. Check ANTHROPIC_API_KEY." };
    if (err instanceof Anthropic.APIError) return { ok: false, error: "Couldn't reach Claude. Try again." };
    return { ok: false, error: "Something went wrong saving that. Try again." };
  }
}

const cleanIds = (v: unknown): number[] =>
  Array.isArray(v) ? [...new Set(v.filter((n): n is number => Number.isInteger(n) && n > 0))].slice(0, 500) : [];

// Manual edits from the report: delete selected entries, or move them to another day.
export async function deleteLogged(setIds: number[], cardioIds: number[]): Promise<EditResult> {
  if (!(await isLoggedIn())) return { ok: false, error: "Your session ended. Log in again." };
  const s = cleanIds(setIds), c = cleanIds(cardioIds);
  if (!s.length && !c.length) return { ok: false, error: "Select something first." };
  try {
    await deleteEntries(s, c);
    return { ok: true };
  } catch (err) {
    console.error("delete failed:", err);
    return { ok: false, error: "Couldn't delete that. Try again." };
  }
}

export async function moveLogged(setIds: number[], cardioIds: number[], toDay: string): Promise<EditResult> {
  if (!(await isLoggedIn())) return { ok: false, error: "Your session ended. Log in again." };
  const s = cleanIds(setIds), c = cleanIds(cardioIds);
  if (!s.length && !c.length) return { ok: false, error: "Select something first." };
  const day = parseDay(toDay, todayIn());
  if (!day) return { ok: false, error: "Pick today or a day in the past year." };
  try {
    await moveEntries(s, c, day);
    return { ok: true };
  } catch (err) {
    console.error("move failed:", err);
    return { ok: false, error: "Couldn't move that. Try again." };
  }
}
