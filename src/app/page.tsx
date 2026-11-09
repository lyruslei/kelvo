import PageSlide from "@/components/PageSlide";
import { requireSession } from "@/lib/session";
import { computeGlow, PREVIEWS } from "@/lib/muscles";
import { addDays, HISTORY_DAYS, niceDate, parseDay, todayIn } from "@/lib/days";
import { loadDay, loadHistory } from "@/lib/store";
import { isRestDay } from "@/lib/schedule";
import { summarizeDay } from "@/lib/turn";
import Wordmark from "@/components/Wordmark";
import BodyMap from "@/components/BodyMap";
import RestDay from "@/components/RestDay";
import Chat from "@/components/Chat";
import DayPicker from "@/components/DayPicker";
import styles from "./today.module.css";

// Personal, per-request page (reads the session cookie), so it renders on the server each time.
export const instant = false;

export default async function TodayPage({ searchParams }: PageProps<"/">) {
  await requireSession();
  const params = await searchParams;

  // ?day=YYYY-MM-DD views (and logs to) an earlier day; anything else means today.
  const today = todayIn();
  const day = parseDay(params.day, today) ?? today;
  const isToday = day === today;

  const [data, history] = await Promise.all([loadDay(day), loadHistory(day, 7)]);
  const summary = summarizeDay(data.sets, data.cardio);

  // ?preview=push|pull|legs|chest-arms|rest shows a sample body instead of the day's.
  const key = typeof params.preview === "string" ? params.preview : "";
  // Rest day (chosen in chat, or earned): the sleeping figure, until you log a lift anyway.
  const earned = !data.rest && isRestDay(day, history);
  const isRest = key === "rest" || (!key && !data.sets.length && (data.rest || earned));
  const glow = PREVIEWS[key] ? computeGlow(PREVIEWS[key]) : summary.glow;

  return (
    <PageSlide>
    <div className={styles.shell}>
      <header className={styles.header}>
        <Wordmark />
      </header>

      <main className={styles.main}>
        <DayPicker day={day} today={today} min={addDays(today, -HISTORY_DAYS)} label={isToday ? "Today" : niceDate(day)} />

        <section className={styles.card} aria-labelledby="day-card">
          <h2 id="day-card" className="sr-only">{isRest ? "Rest day" : "Muscles worked"}</h2>
          <div className={styles.body}>
            {isRest ? <RestDay /> : <BodyMap glow={glow} />}
          </div>
          {isRest && (
            <p className={styles.restNote}>
              {earned ? "Rest day. Every muscle group got a full session in the 3 days before." : "Rest day. Recover well."}
            </p>
          )}
          <dl className={styles.stats}>
            <div><dt>Volume</dt><dd>{summary.volumeKg.toLocaleString()}<small> kg</small></dd></div>
            <div><dt>Sets</dt><dd>{summary.sets}</dd></div>
            <div><dt>Cardio</dt><dd>{summary.cardioMin}<small> min</small></dd></div>
          </dl>
        </section>

        {/* Keyed by day and count so a refresh after saving swaps in the stored messages. */}
        <Chat key={`${day}:${data.messages.length}`} initial={data.messages} day={day} isToday={isToday} />
      </main>
    </div>
    </PageSlide>
  );
}
