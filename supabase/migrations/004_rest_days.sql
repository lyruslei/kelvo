-- Rest days you choose in chat ("rest day today", "taking today off, legs are wrecked").
-- One row per day; the home screen shows the sleeping figure on these days.
create table if not exists rest_days (
  day date primary key,
  created_at timestamptz not null default now()
);
alter table rest_days enable row level security;
