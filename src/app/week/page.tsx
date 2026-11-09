import SlideLink from "@/components/SlideLink";
import PageSlide from "@/components/PageSlide";
import { requireSession } from "@/lib/session";
import { todayIn } from "@/lib/days";
import WeekView from "@/components/WeekView";
import styles from "../report/report.module.css";

export const instant = false;

// Stand-alone week page (the session page also shows this as its last swipe panel).
export default async function WeekPage() {
  await requireSession();
  return (
    <PageSlide>
    <div className={styles.shell}>
      <header className={styles.header}>
        <SlideLink href="/report" className={styles.back} slide="back">‹ Session</SlideLink>
      </header>
      <main>
        <h1 className={styles.title}>Last 7 days</h1>
        <WeekView endDay={todayIn()} />
      </main>
    </div>
    </PageSlide>
  );
}
