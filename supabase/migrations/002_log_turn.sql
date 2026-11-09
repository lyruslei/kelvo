-- Saves one chat turn atomically: new exercises, the sets, cardio sessions and the
-- two chat messages all commit together, or none of them do.
--
-- p_lifts:    [{exercise, primary: [muscle], secondary: [muscle], sets: [{reps, weight_kg}]}]
--             A known exercise keeps its library muscles; an unknown one is added (source 'ai').
-- p_cardio:   [{kind, minutes, distance_km, speed_kmh, incline_pct}]
-- p_messages: [{role, text}]
create or replace function log_turn(p_day date, p_lifts jsonb, p_cardio jsonb, p_messages jsonb)
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

    -- Sets continue numbering if this lift was already logged today.
    select coalesce(max(set_no), 0) into next_set from lift_sets where day = p_day and exercise_id = ex_id;

    insert into lift_sets (day, exercise_id, set_no, reps, weight_kg)
    select p_day, ex_id, next_set + s.ord::int, (s.val->>'reps')::int, (s.val->>'weight_kg')::real
    from jsonb_array_elements(l->'sets') with ordinality as s(val, ord);
  end loop;

  insert into cardio_sessions (day, kind, minutes, distance_km, speed_kmh, incline_pct)
  select p_day, c->>'kind', (c->>'minutes')::real,
         (c->>'distance_km')::real, (c->>'speed_kmh')::real, (c->>'incline_pct')::real
  from jsonb_array_elements(coalesce(p_cardio, '[]'::jsonb)) as c;

  insert into messages (day, role, text)
  select p_day, m->>'role', m->>'text'
  from jsonb_array_elements(coalesce(p_messages, '[]'::jsonb)) as m;
end;
$$;

-- Only the server (service role) may call it.
revoke execute on function log_turn(date, jsonb, jsonb, jsonb) from public, anon, authenticated;
