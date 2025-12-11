-- Create session_participants table for per-angler session context

create table if not exists session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text,
  spot_name text,
  mark_id uuid references saved_marks(id) on delete set null,
  latitude double precision,
  longitude double precision,
  water_type text,
  location_privacy text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_session_participants_session_user
  on session_participants(session_id, user_id);

alter table session_participants enable row level security;

create policy "session_participants_own_rows" on session_participants
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_session_participants_updated_at
  before update on session_participants
  for each row
  execute function set_updated_at();
