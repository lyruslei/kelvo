-- rumbi schema. Only the Next.js server (service-role key) touches these tables;
-- RLS is on with no policies, so the public anon key can read nothing.

-- Muscle groups the body map can light up. Cardio never lights anything.
create type muscle as enum (
  'chest', 'front_delts', 'side_delts', 'rear_delts',
  'biceps', 'triceps', 'forearms',
  'upper_back', 'lats', 'traps', 'lower_back',
  'abs', 'obliques',
  'glutes', 'quads', 'hamstrings', 'adductors', 'calves'
);

-- Exercise library: each lift maps to the muscles it hits fully (primary) and softly (secondary).
-- Seeded with common lifts; the chat adds new ones the AI maps (source = 'ai').
create table exercises (
  id bigint generated always as identity primary key,
  name text not null unique,               -- canonical, lowercase: 'incline dumbbell press'
  primary_muscles muscle[] not null,
  secondary_muscles muscle[] not null default '{}',
  source text not null default 'seed' check (source in ('seed', 'ai', 'manual')),
  created_at timestamptz not null default now()
);

-- One row per set, so progress (more kg or more reps) can be compared session to session.
create table lift_sets (
  id bigint generated always as identity primary key,
  day date not null,
  exercise_id bigint not null references exercises(id),
  set_no int not null check (set_no > 0),
  reps int not null check (reps > 0),
  weight_kg real not null check (weight_kg >= 0),   -- 0 for bodyweight
  created_at timestamptz not null default now()
);
create index lift_sets_day on lift_sets(day);
create index lift_sets_exercise_day on lift_sets(exercise_id, day);

-- Runs, treadmill and other cardio: stats only.
create table cardio_sessions (
  id bigint generated always as identity primary key,
  day date not null,
  kind text not null,                      -- 'treadmill', 'outdoor run', 'bike', ...
  minutes real not null check (minutes > 0),
  distance_km real,                        -- given, or minutes x speed
  speed_kmh real,
  incline_pct real,
  created_at timestamptz not null default now()
);
create index cardio_sessions_day on cardio_sessions(day);

create table messages (
  id bigint generated always as identity primary key,
  day date not null,
  role text not null check (role in ('user', 'bot')),
  text text not null,
  created_at timestamptz not null default now()
);
create index messages_day on messages(day);

alter table exercises enable row level security;
alter table lift_sets enable row level security;
alter table cardio_sessions enable row level security;
alter table messages enable row level security;

insert into exercises (name, primary_muscles, secondary_muscles) values
  ('bench press',               '{chest}',               '{front_delts,triceps}'),
  ('incline dumbbell press',    '{chest}',               '{front_delts,triceps}'),
  ('incline bench press',       '{chest}',               '{front_delts,triceps}'),
  ('dumbbell fly',              '{chest}',               '{front_delts}'),
  ('cable fly',                 '{chest}',               '{front_delts}'),
  ('push up',                   '{chest}',               '{front_delts,triceps,abs}'),
  ('dips',                      '{chest,triceps}',       '{front_delts}'),
  ('overhead press',            '{front_delts}',         '{side_delts,triceps,traps}'),
  ('dumbbell shoulder press',   '{front_delts}',         '{side_delts,triceps}'),
  ('lateral raise',             '{side_delts}',          '{traps}'),
  ('rear delt fly',             '{rear_delts}',          '{upper_back}'),
  ('face pull',                 '{rear_delts}',          '{upper_back,traps}'),
  ('shrug',                     '{traps}',               '{forearms}'),
  ('pull up',                   '{lats}',                '{biceps,upper_back,forearms}'),
  ('lat pulldown',              '{lats}',                '{biceps,upper_back}'),
  ('barbell row',               '{upper_back,lats}',     '{biceps,rear_delts,lower_back}'),
  ('seated cable row',          '{upper_back,lats}',     '{biceps,rear_delts}'),
  ('dumbbell row',              '{lats,upper_back}',     '{biceps,rear_delts}'),
  ('deadlift',                  '{hamstrings,glutes,lower_back}', '{traps,forearms,quads,upper_back}'),
  ('romanian deadlift',         '{hamstrings,glutes}',   '{lower_back,forearms}'),
  ('back squat',                '{quads,glutes}',        '{adductors,hamstrings,lower_back}'),
  ('front squat',               '{quads}',               '{glutes,abs,upper_back}'),
  ('leg press',                 '{quads,glutes}',        '{adductors,hamstrings}'),
  ('bulgarian split squat',     '{quads,glutes}',        '{adductors,hamstrings}'),
  ('lunge',                     '{quads,glutes}',        '{hamstrings,adductors}'),
  ('leg extension',             '{quads}',               '{}'),
  ('leg curl',                  '{hamstrings}',          '{calves}'),
  ('hip thrust',                '{glutes}',              '{hamstrings}'),
  ('calf raise',                '{calves}',              '{}'),
  ('barbell curl',              '{biceps}',              '{forearms}'),
  ('dumbbell curl',             '{biceps}',              '{forearms}'),
  ('hammer curl',               '{biceps,forearms}',     '{}'),
  ('preacher curl',             '{biceps}',              '{forearms}'),
  ('tricep pushdown',           '{triceps}',             '{}'),
  ('overhead tricep extension', '{triceps}',             '{}'),
  ('skull crusher',             '{triceps}',             '{}'),
  ('close grip bench press',    '{triceps}',             '{chest,front_delts}'),
  ('crunch',                    '{abs}',                 '{}'),
  ('hanging leg raise',         '{abs}',                 '{obliques,forearms}'),
  ('plank',                     '{abs}',                 '{obliques,lower_back}'),
  ('russian twist',             '{obliques}',            '{abs}'),
  ('cable crunch',              '{abs}',                 '{obliques}');
