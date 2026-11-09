"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, checkPassword, createToken, SESSION_COOKIE, TOKEN_TTL_MS } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const env = process.env;
  if (!authConfigured(env)) {
    console.error("Login disabled: APP_PASSWORD must be at least 12 characters and TOKEN_SECRET must be set.");
    return { error: "Login isn't set up on the server yet." };
  }
  if (!checkPassword(formData.get("password"), env.APP_PASSWORD)) {
    // Slow down guessing a little.
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Wrong password." };
  }

  (await cookies()).set(SESSION_COOKIE, createToken(env.TOKEN_SECRET!, Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_MS / 1000,
  });
  redirect("/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
