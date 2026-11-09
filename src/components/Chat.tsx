"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/app/actions";
import type { Message } from "@/lib/store";
import styles from "@/app/today.module.css";

const HELLO =
  "Tell me what you did and I'll log it. For example: “incline db press 3x10 at 24kg” or “15 min incline treadmill, 20 incline, 4.2 km/h”.";

export default function Chat({ initial, day, isToday }: { initial: Message[]; day: string; isToday: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const msg = text.trim();
    if (!msg) return setError("Type what you did first.");
    if (pending) return;
    setError("");
    setText("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    startTransition(async () => {
      const res = await sendMessage(msg, day);
      if (res.ok) {
        setMessages((m) => [...m, { role: "bot", text: res.reply }]);
        router.refresh(); // updates the body map and stats
      } else {
        setMessages((m) => m.slice(0, -1)); // the message wasn't saved
        setText(msg);
        setError(res.error);
      }
    });
  }

  return (
    <>
      <section className={styles.chat} aria-label="Chat" aria-live="polite">
        {messages.length === 0 && <p className={styles.bot}>{isToday ? HELLO : "Forgot to log this day? Tell me what you did and I'll add it here."}</p>}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <p key={i} className={styles.user}>{m.text}</p>
          ) : (
            <p key={i} className={styles.bot}>{m.text}</p>
          ),
        )}
        {pending && <p className={`${styles.bot} ${styles.thinking}`}>Logging…</p>}
        <div ref={endRef} />
      </section>

      <form className={styles.composer} onSubmit={submit}>
        {error && <p className={styles.composerNote} role="alert">{error}</p>}
        <label htmlFor="msg" className="sr-only">What did you do?</label>
        <input
          id="msg"
          name="msg"
          placeholder="What did you lift or run?"
          autoComplete="off"
          value={text}
          onChange={(e) => { setText(e.target.value); if (error) setError(""); }}
          maxLength={2000}
        />
        <button type="submit" className="primary" disabled={pending}>Send</button>
      </form>
    </>
  );
}
