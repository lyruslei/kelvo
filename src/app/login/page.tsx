"use client";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import Wordmark from "@/components/Wordmark";
import styles from "./login.module.css";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <main className={styles.page}>
      <Wordmark size="lg" />
      <p className={styles.tag}>Log lifts and runs by chatting.</p>
      <form action={action} className={styles.form}>
        <label htmlFor="password" className={styles.label}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-describedby={state.error ? "login-error" : undefined}
          aria-invalid={!!state.error}
        />
        {state.error && <p id="login-error" className={styles.error} role="alert">{state.error}</p>}
        <button type="submit" className="primary" disabled={pending}>
          {pending ? "Checking…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
