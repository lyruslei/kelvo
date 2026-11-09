-- Timed holds (plank 60s), chat corrections/removals, logging to another day,
-- and manual delete / move-to-day from the report.

-- A set has reps, or a duration (seconds), or both.
alter table lift_sets alter column reps drop not null;
alter table lift_sets drop constraint if exists lift_sets_reps_check;
alter table lift_sets add column if not exists duration_s int check (duration_s is null or duration_s > 0);
alter table lift_sets add constraint lift_sets_reps_positive check (reps is null or reps > 0);
alter table lift_sets add constraint lift_sets_reps_or_time check (reps is not null or duration_s is not null);

-- Keeps set numbers 1, 2, 3... per exercise on a day after removals or moves.
create or replace function renumber_sets(p_day date)
returns void
language sql
security invoker
set search_path = public
as $$
  update lift_sets s set set_no = r.rn
  from (
    select id, row_number() over (partition by exercise_id order by set_no, id) as rn
    from lift_sets where day = p_day
  ) r
  where s.id = r.id and s.set_no <> r.rn;
$$;

drop function if exists log_turn(date, jsonb, jsonb, jsonb);

-- One chat turn, all or nothing.
-- p_msg_day:   the day on screen (chat messages and removals belong to it)
-- p_entry_day: where new lifts and cardio go (usually the same day; "yesterday I..." moves it)
-- p_lifts:     [{exercise, primary, secondary, sets: [{reps, weight_kg, duration_s}]}]
-- p_remove_*:  ids shown to Claude for the day on screen (corrections and "remove the ...")
create or replace function log_turn(
  p_msg_day date, p_entry_day date,
  p_lifts jsonb, p_cardio jsonb, p_messages jsonb,
  p_remove_sets bigint[], p_remove_cardio bigint[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  l jsonb;
  ex_id bigint;
  next_set int;
begin
  delete from lift_sets where day = p_msg_day and id = any(coalesce(p_remove_sets, '{}'));
  delete from cardio_sessions where day = p_msg_day and id = any(coalesce(p_remove_cardio, '{}'));

  for l in select * from jsonb_array_elements(coalesce(p_lifts, '[]'::jsonb)) loop
    insert into exercises (name, primary_muscles, secondary_muscles, source)
    values (
      l->>'exercise',
      array(select jsonb_array_elements_text(l->'primary'))::muscle[],
      array(select jsonb_array_elements_text(coalesce(l->'secondary', '[]'::jsonb)))::muscle[],
      'ai'
    )
    on conflict (name) do nothing;

    select id into ex_id from exercises where name = l->>'exercise';
    select coalesce(max(set_no), 0) into next_set from lift_sets where day = p_entry_day and exercise_id = ex_id;

    insert into lift_sets (day, exercise_id, set_no, reps, weight_kg, duration_s)
    select p_entry_day, ex_id, next_set + s.ord::int,
           (s.val->>'reps')::int, (s.val->>'weight_kg')::real, (s.val->>'duration_s')::int
    from jsonb_array_elements(l->'sets') with ordinality as s(val, ord);
  end loop;

  insert into cardio_sessions (day, kind, minutes, distance_km, speed_kmh, incline_pct)
  select p_entry_day, c->>'kind', (c->>'minutes')::real,
         (c->>'distance_km')::real, (c->>'speed_kmh')::real, (c->>'incline_pct')::real
  from jsonb_array_elements(coalesce(p_cardio, '[]'::jsonb)) as c;

  insert into messages (day, role, text)
  select p_msg_day, m->>'role', m->>'text'
  from jsonb_array_elements(coalesce(p_messages, '[]'::jsonb)) as m;

  perform renumber_sets(p_msg_day);
  if p_entry_day <> p_msg_day then perform renumber_sets(p_entry_day); end if;
end;
$$;

-- Manual delete from the report.
create or replace function delete_entries(p_set_ids bigint[], p_cardio_ids bigint[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare d date;
begin
  for d in select distinct day from lift_sets where id = any(coalesce(p_set_ids, '{}')) loop
    delete from lift_sets where day = d and id = any(p_set_ids);
    perform renumber_sets(d);
  end loop;
  delete from cardio_sessions where id = any(coalesce(p_cardio_ids, '{}'));
end;
$$;

-- Manual move to another day from the report. Moved sets go after any already on that day.
create or replace function move_entries(p_set_ids bigint[], p_cardio_ids bigint[], p_to date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare d date;
begin
  for d in select distinct day from lift_sets where id = any(coalesce(p_set_ids, '{}')) and day <> p_to loop
    update lift_sets set day = p_to, set_no = set_no + 1000 where day = d and id = any(p_set_ids);
    perform renumber_sets(d);
  end loop;
  perform renumber_sets(p_to);
  update cardio_sessions set day = p_to where id = any(coalesce(p_cardio_ids, '{}'));
end;
$$;

-- Only the server (service role) may call these.
revoke execute on function renumber_sets(date) from public, anon, authenticated;
revoke execute on function log_turn(date, date, jsonb, jsonb, jsonb, bigint[], bigint[]) from public, anon, authenticated;
revoke execute on function delete_entries(bigint[], bigint[]) from public, anon, authenticated;
revoke execute on function move_entries(bigint[], bigint[], date) from public, anon, authenticated;
