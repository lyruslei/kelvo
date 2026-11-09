// Signed login tokens (HMAC-SHA256) and a timing-safe password check. Ported from timbi.
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "kelvo_session";
export const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 12;

const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

// Hash both sides first so timingSafeEqual always gets equal-length buffers.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function createToken(secret: string, nowMs: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: nowMs + TOKEN_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyToken(token: unknown, secret: string | undefined, nowMs: number): boolean {
  try {
    if (typeof token !== "string" || !secret) return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payload, sig] = parts;
    if (!safeEqual(sig, sign(payload, secret))) return false;
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof exp === "number" && nowMs < exp;
  } catch {
    return false;
  }
}

export function checkPassword(given: unknown, expected: string | undefined): boolean {
  if (typeof given !== "string" || !given || typeof expected !== "string" || !expected) return false;
  return safeEqual(given, expected);
}

// Login stays off until both settings are present and the password is long enough to resist guessing.
export function authConfigured(env: Record<string, string | undefined>): boolean {
  return !!env.TOKEN_SECRET && typeof env.APP_PASSWORD === "string" && env.APP_PASSWORD.length >= MIN_PASSWORD_LENGTH;
}
