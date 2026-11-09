"use server";
import Anthropic from "@anthropic-ai/sdk";
import { isLoggedIn } from "@/lib/session";
import { askCoach } from "@/lib/coach";
import { todayIn } from "@/lib/days";
import { describeDay, loadDay, loadHistory, loadLibrary, saveTurn } from "@/lib/store";
import { describePlan, suggestNext } from "@/lib/schedule";
import { normalizeTurn } from "@/lib/turn";

export type ChatResult = { ok: true; reply: string } | { ok: false; error: string };

const MAX_TEXT = 2000;

export async function sendMessage(text: string): Promise<ChatResult> {
  if (!(await isLoggedIn())) return { ok: false, error: "Your session ended. Log in again." };
  const msg = typeof text === "string" ? text.trim() : "";
  if (!msg) return { ok: false, error: "Type what you did first." };
  if (msg.length > MAX_TEXT) return { ok: false, error: `Keep it under ${MAX_TEXT} characters.` };

  const day = todayIn();
  try {
    const [library, today, history] = await Promise.all([loadLibrary(), loadDay(day), loadHistory(day)]);
    const raw = await askCoach({
      text: msg,
      today: day,
      libraryNames: [...library.keys()],
      todayLog: describeDay(today.sets, today.cardio),
      plan: describePlan(suggestNext(day, history)),
      history: today.messages.slice(-20),
    });
    const turn = normalizeTurn(raw, library);
    await saveTurn(day, turn, msg);
    return { ok: true, reply: turn.reply };
  } catch (err) {
    console.error("chat failed:", err);
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "Too many messages at once. Try again in a minute." };
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, error: "The Claude API key isn't working. Check ANTHROPIC_API_KEY." };
    if (err instanceof Anthropic.APIError) return { ok: false, error: "Couldn't reach Claude. Try again." };
    return { ok: false, error: "Something went wrong saving that. Try again." };
  }
}
