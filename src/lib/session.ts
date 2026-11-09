import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SESSION_COOKIE, verifyToken } from "./auth";

export async function isLoggedIn(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await connection(); // request time, so Date.now() below is the real "now"
  return verifyToken(token, process.env.TOKEN_SECRET, Date.now());
}

// The real check. Call it in every page, server action and route handler that touches data;
// the proxy redirect is only a convenience.
export async function requireSession(): Promise<void> {
  if (!(await isLoggedIn())) redirect("/login");
}
