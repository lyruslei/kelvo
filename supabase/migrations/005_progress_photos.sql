-- Progress photos: one front photo per day, kept forever.
-- The image lives in a private Storage bucket at "<day>.jpg"; pages show it through short-lived signed URLs.
create table if not exists progress_photos (
  day date primary key,
  path text not null,
  updated_at timestamptz not null default now()
);
alter table progress_photos enable row level security;

-- Private: no public URLs. Only the server (service-role key) reads and writes it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;
