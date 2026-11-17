import Link from "next/link";
import SlideLink from "@/components/SlideLink";
import PageSlide from "@/components/PageSlide";
import RangePicker from "@/components/RangePicker";
import { requireSession } from "@/lib/session";
import { daysApart, monthName, monthOf, shiftMonth, shortDate, todayIn } from "@/lib/days";
import { loadPhotoDays, photoUrls } from "@/lib/store";
import report from "../../report/report.module.css";
import styles from "./progress.module.css";

export const instant = false;

// Progress photos side by side: the month's first and latest, or any two days you pick (Custom).
export default async function ProgressPage({ searchParams }: PageProps<"/activity/progress">) {
  await requireSession();
  const params = await searchParams;
  const thisMonth = monthOf(todayIn());
  const photoDays = await loadPhotoDays(); // oldest first, kept forever
  const custom = params.mode === "custom";

  const asked = params.month;
  const month = typeof asked === "string" && /^\d{4}-\d{2}$/.test(asked) && asked <= thisMonth ? asked : thisMonth;
  const firstMonth = photoDays.length ? monthOf(photoDays[0]) : thisMonth;

  let pair: string[];
  let from = "", to = "";
  if (custom) {
    const pick = (v: unknown, fallback: string) => (typeof v === "string" && photoDays.includes(v) ? v : fallback);
    from = pick(params.from, photoDays[0] ?? "");
    to = pick(params.to, photoDays[photoDays.length - 1] ?? "");
    if (from > to) [from, to] = [to, from];
    pair = !from ? [] : from === to ? [from] : [from, to];
  } else {
    const inMonth = photoDays.filter((d) => monthOf(d) === month);
    pair = inMonth.length > 1 ? [inMonth[0], inMonth[inMonth.length - 1]] : inMonth;
  }
  const urls = await photoUrls(pair);

  return (
    <PageSlide>
      <div className={report.shell}>
        <header className={report.header}>
          <SlideLink href={`/activity?month=${month}`} className={report.back} slide="back">‹ Activity</SlideLink>
        </header>
        <main>
          <h1 className={report.title}>Your progress</h1>

          <nav className={styles.toggle} aria-label="Compare">
            <Link href={`/activity/progress?month=${month}`} replace className={custom ? "" : styles.on} aria-current={custom ? undefined : "page"}>This month</Link>
            <Link href={`/activity/progress?mode=custom&month=${month}`} replace className={custom ? styles.on : ""} aria-current={custom ? "page" : undefined}>Custom</Link>
          </nav>

          {custom ? (
            photoDays.length > 1 && <RangePicker days={photoDays} from={from} to={to} month={month} />
          ) : (
            <div className={styles.monthBar}>
              {month > firstMonth
                ? <Link href={`/activity/progress?month=${shiftMonth(month, -1)}`} replace className={styles.arrow} aria-label="Previous month">‹</Link>
                : <span className={styles.arrow} />}
              <h2 className={styles.month}>{monthName(month)}</h2>
              {month < thisMonth
                ? <Link href={`/activity/progress?month=${shiftMonth(month, 1)}`} replace className={styles.arrow} aria-label="Next month">›</Link>
                : <span className={styles.arrow} />}
            </div>
          )}

          {pair.length === 0 ? (
            <p className={styles.empty}>{custom ? "No progress photos yet. Snap one from Activity." : `No progress photos in ${monthName(month)}.`}</p>
          ) : (
            <>
              <div className={styles.pair}>
                {pair.map((d) => (
                  <figure key={d} className={styles.photo}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed URL from a private bucket */}
                    <img src={urls.get(d)} alt={`Progress photo, ${shortDate(d, true)}`} />
                    <figcaption>{shortDate(d, custom)}</figcaption>
                  </figure>
                ))}
              </div>
              {pair.length === 2
                ? <p className={styles.apart}><strong>{daysApart(pair[0], pair[1])} days</strong> apart</p>
                : <p className={styles.empty}>Snap another photo to compare.</p>}
            </>
          )}
        </main>
      </div>
    </PageSlide>
  );
}
