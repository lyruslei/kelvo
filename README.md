# kelvo

A workout tracker you talk to. Type what you did the way you'd text a friend, and kelvo logs it, lights up the muscles you trained on a body map, and tells you what to train next.

> "bench 3x8 @ 60, then incline db 22s 10 9 8, 20 min incline treadmill at 5.5"

That one message becomes three exercises, seven sets and a cardio session, each saved as a separate row in the database. Typos, shorthand, pounds and corrections ("the bench was 65 not 60") all work.

Built as a mobile-first web app you install to your phone's home screen.

## What it does

- **Logging by chat.** Claude reads the message and fills in a strict JSON schema. The server then checks every field again before anything is saved, so a bad model reply can't corrupt the data.
- **Body map.** 18 muscle groups light up in full for the main muscles an exercise works and softly for the helpers.
- **Corrections and edits.** You can fix, delete or move entries by chat ("delete that run", "that was yesterday") or by hand from the session report.
- **Progress tracking.** Each lift is compared with your last session of it: up, same or down, plus personal records and a target for next time. Ask "what weight for db chest?" and it answers with what you did last time and what to aim for today.
- **Training plan without a fixed split.** It suggests the muscle groups you've rested longest, never a group you trained the day before, and suggests a rest day once every group has had a full session.
- **Rest days**, including planned ones ("Saturday's a rest day, I have a wedding").
- **Activity calendar and progress photos.** A heatmap of trained and rest days, plus one photo per day that you can compare side by side.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| AI | Claude via the Anthropic SDK, with structured JSON output |
| Database | Supabase (Postgres + private Storage) |
| Hosting | Vercel |
| Tests | Node's built-in test runner (`node --test`) |

No UI library: hand-written CSS modules and an SVG body map.

## How it's built

```
src/
  app/            pages and server actions (chat, edits, photo upload, login)
  components/     body map, chat, week view, calendar, swipeable report panels
  lib/
    coach.ts      the only file that talks to Claude: system prompt + JSON schema
    turn.ts       validates and cleans the model's reply (pure, tested)
    schedule.ts   split-free planning and rest-day logic (pure, tested)
    progress.ts   session-to-session comparison, PRs, next targets (pure, tested)
    muscles.ts    muscle groups and body-map glow
    store.ts      all database reads and writes
    auth.ts       signed session tokens, timing-safe password check
supabase/         schema and migrations
```

Some design decisions:

- **Don't trust the model's output.** Claude only proposes a change. `turn.ts` checks it: the right types, numbers within sensible ranges, only known muscle names, and only entry IDs that are actually on screen. Then the server saves it in one database transaction.
- **Keep the logic pure.** Planning, progress comparison, date handling and validation do no I/O, so they have unit tests.
- **Lock the database down.** Every table has row-level security turned on with no rules that allow access. Only the server, using the service-role key, can read or write data. The Claude key and the database key never reach the browser. Photos are stored in a private bucket and shown through links that expire.
- **One user, one password.** Login sets a signed, httpOnly cookie. Every page and server action checks it.

## Running it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

You'll need a Supabase project: run `supabase/schema.sql` and then the files in `supabase/migrations/` in order. You'll also need an Anthropic API key. `.env.example` lists every setting.

```bash
npm test
```
