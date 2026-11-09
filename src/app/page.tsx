import Link from "next/link";
import { requireSession } from "@/lib/session";
import { computeGlow, PREVIEWS } from "@/lib/muscles";
import { todayIn } from "@/lib/days";
import { loadDay, loadHistory } from "@/lib/store";
import { isRestDay } from "@/lib/schedule";
import { summarizeDay } from "@/lib/turn";
import Wordmark from "@/components/Wordmark";
import BodyMap from "@/components/BodyMap";
import RestDay from "@/components/RestDay";
import Chat from "@/components/Chat";
import styles from "./today.module.css";

// Personal, per-request page (reads the session cookie), so it renders on the server each time.
export const instant = false;

export default async function TodayPage({ searchParams }: PageProps<"/">) {
  await requireSession();

  const day = todayIn();
  const [data, history] = await Promise.all([loadDay(day), loadHistory(day, 7)]);
  const summary = summarizeDay(data.sets, data.cardio);

  // ?preview=push|pull|legs|chest-arms|rest shows a sample body instead of today's.
  const preview = (await searchParams).preview;
  const key = typeof preview === "string" ? preview : "";
  // Earned rest day: the sleeping figure, until you log a lift anyway.
  const isRest = key === "rest" || (!key && !data.sets.length && isRestDay(day, history));
  const glow = PREVIEWS[key] ? computeGlow(PREVIEWS[key]) : summary.glow;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Wordmark />
      </header>

      <main className={styles.main}>
        <h1 className={styles.day}>
          Today
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="var(--yellow)" /></svg>
        </h1>

        <section className={styles.card} aria-labelledby="today-card">
          <h2 id="today-card" className="sr-only">{isRest ? "Rest day" : "Muscles worked today"}</h2>
          <Link href="/report" className={styles.more}>Show more ›</Link>
          <div className={styles.body}>
            {isRest ? <RestDay /> : <BodyMap glow={glow} />}
          </div>
          {isRest && <p className={styles.restNote}>Rest day. Every muscle group got a full session in the last 3 days.</p>}
          <dl className={styles.stats}>
            <div><dt>Volume</dt><dd>{summary.volumeKg.toLocaleString()}<small> kg</small></dd></div>
            <div><dt>Sets</dt><dd>{summary.sets}</dd></div>
            <div><dt>Cardio</dt><dd>{summary.cardioMin}<small> min</small></dd></div>
          </dl>
        </section>

        {/* Keyed by count so a refresh after saving swaps in the stored messages. */}
        <Chat key={data.messages.length} initial={data.messages} />
      </main>
    </div>
  );
}
