---
description: Rebuild competitions as collaborative sessions with live leaderboards and visual distinction
---

# Rebuild Competitions as Collaborative Sessions

Transforms competitions from a "submit your best session" model to a "join and log catches live" model. Competitions become special collaborative sessions where multiple users fish together, log catches, and compete in real-time based on catch data (heaviest fish, most catches, species diversity, etc.). Includes visual distinction with yellow/gold color scheme for competitions vs green for regular sessions.

---

## Core Concept

**Old model (submit session):**
- User creates personal session.
- User submits session to competition.
- System compares sessions.
- Complex eligibility rules.
- Static entries.

**New model (collaborative sessions):**
- Host creates competition (which creates a linked session).
- Users join competition (added as contributors to that session).
- Users log catches directly to the competition session.
- Live leaderboard based on catch data.
- Real-time updates as catches come in.
- Visually distinct (yellow/gold) for competitions vs green for regular sessions.

Benefits:
- Uses existing session / catch infrastructure.
- Real-time competition experience.
- Natural collaborative flow.
- Simpler mental model.
- Better social integration.
- No complex eligibility logic.
- Clear visual distinction.

---

## Task 1: Database Migration – Add `session_id` to `competitions`

**File / place:** Supabase SQL editor.

```sql
-- Step 1: Add session_id column to competitions
alter table competitions
  add column session_id uuid references sessions(id) on delete cascade;

-- Step 2: Create index
create index competitions_session_id_idx on competitions(session_id);

-- Step 3: Add reverse lookup (optional but useful)
alter table sessions
  add column competition_id uuid references competitions(id) on delete set null;

create index sessions_competition_id_idx on sessions(competition_id);

-- Step 4: Make session_id NOT NULL after we backfill/migrate
-- (Don't run this yet - wait until we've migrated existing competitions)
-- alter table competitions alter column session_id set not null;
```

Report: `Competition-Session link added ✓`

---

## Task 2: Database Migration – Remove Old Tables

**File / place:** Supabase SQL editor.

Clean up old competition model:

```sql
-- Drop old tables we don't need anymore
drop table if exists competition_entries cascade;
drop table if exists competition_participants cascade;

-- Drop old stats view if it exists
drop materialized view if exists competition_stats cascade;
drop view if exists competition_stats cascade;

-- Drop old RPC functions related to old model
drop function if exists calculate_competition_score(uuid, uuid) cascade;
drop function if exists update_competition_leaderboard(uuid) cascade;
```

Report: `Old competition tables removed ✓`

---

## Task 3: Create Leaderboard Calculation Function

**File / place:** Supabase SQL editor.

Calculate competition standings from catch data:

```sql
create or replace function get_competition_leaderboard(
  p_competition_id uuid
)
returns table (
  rank integer,
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  score numeric,
  catch_count integer,
  best_catch_id uuid,
  best_catch_species text,
  best_catch_weight numeric,
  best_catch_length numeric,
  best_catch_photo text
) 
security definer
as $$
declare
  v_session_id uuid;
  v_comp_type text;
  v_allowed_species text[];
begin
  -- Get competition details
  select c.session_id, c.type, c.allowed_species
  into v_session_id, v_comp_type, v_allowed_species
  from competitions c
  where c.id = p_competition_id;
  
  if v_session_id is null then
    raise exception 'Competition not found or has no linked session';
  end if;
  
  -- Calculate leaderboard based on competition type
  if v_comp_type = 'heaviest_fish' then
    return query
    with user_catches as (
      select 
        c.user_id,
        p.username,
        p.full_name,
        p.avatar_url,
        max(c.weight_kg) as max_weight,
        count(c.id) as total_catches,
        (array_agg(c.id order by c.weight_kg desc nulls last))[1] as top_catch_id
      from catches c
      join profiles p on c.user_id = p.id
      where c.session_id = v_session_id
        and c.weight_kg is not null
        and (v_allowed_species is null or c.species = any(v_allowed_species))
      group by c.user_id, p.username, p.full_name, p.avatar_url
    ),
    ranked as (
      select 
        row_number() over (order by uc.max_weight desc)::integer as rank,
        uc.*,
        bc.species as best_species,
        bc.weight_kg as best_weight,
        bc.length_cm as best_length,
        bc.photo_url as best_photo
      from user_catches uc
      left join catches bc on bc.id = uc.top_catch_id
    )
    select * from ranked order by rank;
    
  elsif v_comp_type = 'longest_fish' then
    return query
    with user_catches as (
      select 
        c.user_id,
        p.username,
        p.full_name,
        p.avatar_url,
        max(c.length_cm) as max_length,
        count(c.id) as total_catches,
        (array_agg(c.id order by c.length_cm desc nulls last))[1] as top_catch_id
      from catches c
      join profiles p on c.user_id = p.id
      where c.session_id = v_session_id
        and c.length_cm is not null
        and (v_allowed_species is null or c.species = any(v_allowed_species))
      group by c.user_id, p.username, p.full_name, p.avatar_url
    ),
    ranked as (
      select 
        row_number() over (order by uc.max_length desc)::integer as rank,
        uc.user_id,
        uc.username,
        uc.full_name,
        uc.avatar_url,
        uc.max_length as score,
        uc.total_catches::integer as catch_count,
        uc.top_catch_id as best_catch_id,
        bc.species as best_species,
        bc.weight_kg as best_weight,
        bc.length_cm as best_length,
        bc.photo_url as best_photo
      from user_catches uc
      left join catches bc on bc.id = uc.top_catch_id
    )
    select * from ranked order by rank;
    
  elsif v_comp_type = 'most_catches' then
    return query
    with user_catches as (
      select 
        c.user_id,
        p.username,
        p.full_name,
        p.avatar_url,
        count(c.id) as total_catches,
        (array_agg(c.id order by c.created_at desc))[1] as latest_catch_id
      from catches c
      join profiles p on c.user_id = p.id
      where c.session_id = v_session_id
        and (v_allowed_species is null or c.species = any(v_allowed_species))
      group by c.user_id, p.username, p.full_name, p.avatar_url
    ),
    ranked as (
      select 
        row_number() over (order by uc.total_catches desc)::integer as rank,
        uc.user_id,
        uc.username,
        uc.full_name,
        uc.avatar_url,
        uc.total_catches::numeric as score,
        uc.total_catches::integer as catch_count,
        uc.latest_catch_id as best_catch_id,
        bc.species as best_species,
        bc.weight_kg as best_weight,
        bc.length_cm as best_length,
        bc.photo_url as best_photo
      from user_catches uc
      left join catches bc on bc.id = uc.latest_catch_id
    )
    select * from ranked order by rank;
    
  elsif v_comp_type = 'species_diversity' then
    return query
    with user_catches as (
      select 
        c.user_id,
        p.username,
        p.full_name,
        p.avatar_url,
        count(distinct c.species) as species_count,
        count(c.id) as total_catches,
        (array_agg(c.id order by c.created_at desc))[1] as latest_catch_id
      from catches c
      join profiles p on c.user_id = p.id
      where c.session_id = v_session_id
        and (v_allowed_species is null or c.species = any(v_allowed_species))
      group by c.user_id, p.username, p.full_name, p.avatar_url
    ),
    ranked as (
      select 
        row_number() over (order by uc.species_count desc)::integer as rank,
        uc.user_id,
        uc.username,
        uc.full_name,
        uc.avatar_url,
        uc.species_count::numeric as score,
        uc.total_catches::integer as catch_count,
        uc.latest_catch_id as best_catch_id,
        bc.species as best_species,
        bc.weight_kg as best_weight,
        bc.length_cm as best_length,
        bc.photo_url as best_photo
      from user_catches uc
      left join catches bc on bc.id = uc.latest_catch_id
    )
    select * from ranked order by rank;
    
  else
    raise exception 'Unknown competition type: %', v_comp_type;
  end if;
end;
$$ language plpgsql;

grant execute on function get_competition_leaderboard(uuid) to authenticated;
```

Report: `Leaderboard calculation function created ✓`

---

## Task 4: Create `competition_stats` View

**File / place:** Supabase SQL editor.

```sql
create or replace view competition_stats as
select 
  c.id as competition_id,
  c.session_id,
  count(distinct sp.user_id) filter (where sp.status = 'active') as participant_count,
  count(distinct cat.id) as catch_count,
  count(distinct cat.user_id) as anglers_with_catches
from competitions c
left join session_participants sp on sp.session_id = c.session_id
left join catches cat on cat.session_id = c.session_id
group by c.id, c.session_id;

grant select on competition_stats to authenticated;
```

Report: `Competition stats view created ✓`

---

## Task 5: Create Competition Session Trigger

**File / place:** Supabase SQL editor.

```sql
create or replace function create_competition_session()
returns trigger
security definer
as $$
declare
  v_session_id uuid;
begin
  -- Only create session if one doesn't exist
  if new.session_id is null then
    -- Create a session for this competition
    insert into sessions (
      user_id,
      title,
      location_name,
      latitude,
      longitude,
      water_type,
      started_at,
      ended_at,
      is_active,
      competition_id
    ) values (
      new.created_by,
      new.title || ' (Competition)',
      coalesce((new.location_restriction->>'name')::text, 'Competition Area'),
      coalesce((new.location_restriction->>'lat')::numeric, null),
      coalesce((new.location_restriction->>'lng')::numeric, null),
      new.water_type,
      new.starts_at,
      new.ends_at,
      (new.status = 'active'),
      new.id
    )
    returning id into v_session_id;
    
    -- Update competition with session_id
    new.session_id := v_session_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

```

```sql
drop trigger if exists create_competition_session_trigger on competitions;
create trigger create_competition_session_trigger
  before insert on competitions
  for each row
  execute function create_competition_session();
```

Report: `Competition session creation trigger added ✓`

---

## Task 6: Update TypeScript Types

**File:** `src/types/index.ts`.

Update `Competition`, add leaderboard type, and annotate `Session`:

```ts
export interface Competition {
  id: string
  created_by: string
  session_id: string
  title: string
  description: string | null
  cover_image_url: string | null
  type: CompetitionType
  allowed_species: string[] | null
  water_type: 'saltwater' | 'freshwater' | 'any' | null
  location_restriction: CompetitionLocationRestriction | null
  starts_at: string
  ends_at: string
  status: CompetitionStatus
  winner_id: string | null
  is_public: boolean
  invite_only: boolean
  max_participants: number | null
  entry_fee: number
  prize: string | null
  created_at: string
  updated_at: string
  creator?: Profile
  winner?: Profile
  session?: Session
  participant_count?: number
  catch_count?: number
  my_rank?: number
}

export interface CompetitionLeaderboardEntry {
  rank: number
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  score: number
  catch_count: number
  best_catch_id: string | null
  best_catch_species: string | null
  best_catch_weight: number | null
  best_catch_length: number | null
  best_catch_photo: string | null
}

export interface Session {
  // existing fields...
  competition_id?: string | null
}

// Remove old CompetitionEntry type when this migration is complete.
```

Report: `TypeScript types updated ✓`

---

## Task 7: Update `useCompetitions` to Session-Based Model

**File:** `src/hooks/useCompetitions.ts`.

Key ideas:
- Active/upcoming lists: select competitions + `creator` + `competition_stats` for counts.
- `useCompetition`: select competition + `creator` + `winner` + `session` + `competition_stats`, and optionally get the current users rank via `get_competition_leaderboard`.
- `useMyCompetitions`: competitions created by current user.
- `useMyEnteredCompetitions`: competitions where current user is an active participant in the linked session.
- `useHasJoinedCompetition`: check `session_participants` for that session.
- `useJoinCompetition` / `useLeaveCompetition`: insert/update `session_participants` accordingly, enforcing max participants.

(See original prompt content for full reference implementation.)

Report: `useCompetitions hook updated ✓`

---

## Task 8: Create `useCompetitionLeaderboard` Hook

**File:** `src/hooks/useCompetitionLeaderboard.ts`.

- `useCompetitionLeaderboard(competitionId)` calls `supabase.rpc('get_competition_leaderboard', { p_competition_id })` and returns `CompetitionLeaderboardEntry[]`.
- `useMyCompetitionCatches(competitionId)` resolves the competitions `session_id` and fetches current users catches in that session.
- Set `refetchInterval` (e.g. 30s) for live updates.

Report: `useCompetitionLeaderboard hook created ✓`

---

## Task 9: Update CreateCompetitionPage

**File:** `src/pages/CreateCompetitionPage.tsx`.

- Keep existing multi-step wizard.
- In the final submit handler, insert into `competitions` only; the trigger will auto-create the linked session.
- Status is derived from `starts_at` vs `now` (`upcoming` vs `active`).
- Navigate to `/compete/{competition.id}` on success.

Report: `CreateCompetitionPage updated ✓`

---

## Task 10: Update CompetitionDetailPage

**File:** `src/pages/CompetitionDetailPage.tsx`.

Goals:
- Treat competition as a special collaborative session.
- Expose actions: Join competition, Log your catch (navigates to `/sessions/{session_id}/catches/new`), Leave competition.
- Show live leaderboard and my stats.
- Use yellow/gold visuals for competitions.

Key points:
- Use `useCompetition`, `useHasJoinedCompetition`, `useJoinCompetition`, `useLeaveCompetition`, `useCompetitionLeaderboard`, `useMyCompetitionCatches`.
- When logging a catch from competition, always use the linked `session_id`.
- Leaderboard shows `CompetitionLeaderboardEntry[]` with highlighting for current user and top 3.

Report: `CompetitionDetailPage updated ✓`

---

## Task 11: Create CompetitionLeaderboard Component

**File:** `src/components/compete/CompetitionLeaderboard.tsx`.

- Props: `leaderboard: CompetitionLeaderboardEntry[]`, `competitionType`, optional `currentUserId`.
- Renders cards per entry with:
  - Rank (🥇/🥈/🥉 or `#n`).
  - Avatar / initials.
  - Name + catch count.
  - Score label depending on competition type.
- Highlight:
  - Current user row with emerald accent.
  - Top 3 with yellow/gold card.

Report: `CompetitionLeaderboard component created ✓`

---

## Task 12: Update CompetitionInfo Component

**File:** `src/components/compete/CompetitionInfo.tsx`.

- Use new `Competition` fields and `competition_stats` view.
- Show:
  - Competition type badge.
  - Duration.
  - Participants count (`competition.participant_count`).
  - Catch count (`competition.catch_count`) when > 0.
  - Rules (species, water type).
  - Location restriction.
  - Prize and entry fee.
  - Description.

Report: `CompetitionInfo component updated ✓`

---

## Task 13: Remove Old Competition Entry Flow

Delete legacy files once the new model is fully in place:

- `src/hooks/useCompetitionEntries.ts`
- `src/components/compete/SessionPickerModal.tsx`
- `src/components/compete/EnterSessionButton.tsx`
- `src/components/compete/JoinCompetitionButton.tsx` (if unused).

Report: `Old competition files removed ✓`

---

## Task 14: Integrate Competition Context into Catch Creation

**File:** catch creation page (e.g. `src/pages/CreateCatchPage.tsx`).

- When user navigates from competition detail to log a catch, route as `/sessions/{session_id}/catches/new`.
- In catch page, query `competitions` by `session_id`.
- If competition exists:
  - Show yellow competition banner with title and allowed species.
  - On submit, validate species against `competition.allowed_species` (if any) and block with clear error if invalid.

Report: `Catch creation updated for competition validation ✓`

---

## Task 15: Visual Distinction – Session Cards

**File:** `src/components/sessions/SessionCard.tsx` (or equivalent).

- Add `isCompetition = !!session.competition_id`.
- For competition sessions:
  - Yellow/gold border and background.
  - Trophy icon.
  - Optional competition badge `🏆 COMPETITION SESSION`.
- For regular sessions:
  - Green/emerald styling with fishing icon.

Report: `Session cards now distinguish competitions ✓`

---

## Task 16: Visual Distinction – Active Session Banner

**File:** Active session banner component.

- If `session.competition_id` is set:
  - Show `Active Competition` label with trophy icon and yellow gradient background.
  - Button uses yellow styling.
- Else:
  - Existing green `Active Session` style.

Report: `Active session banner now distinguishes competitions ✓`

---

## Task 17: Visual Distinction – Logbook Sessions List

**File:** logbook / dashboard sessions tab.

- Split sessions into:
  - `competitionSessions` (with `competition_id`).
  - `regularSessions`.
- Render separate sections:
  - `🏆 COMPETITIONS` with yellow dividers.
  - `🎣 SESSIONS` with green dividers.

Report: `Logbook sessions list now groups and colors competitions ✓`

---

## Task 18: Visual Distinction – Map Markers

**File:** `src/components/map/ExploreMap.tsx` (or map implementation).

- For competition markers:
  - Gold/yellow circular marker with trophy emoji.
- For regular session markers:
  - Green circular marker with fishing emoji.

Report: `Map markers now use gold for competitions ✓`

---

## Task 19: Visual Distinction – Feed Post Cards

**File:** feed post / catch post component.

- If `post.session?.competition_id` is set and competition is joined:
  - Show yellow competition badge section in card:
    - `🏆 Competition Catch` label.
    - Competition title.
    - Optional `#rank` pill.

Report: `Feed posts now show competition badge ✓`

---

## Task 20: DB Validation Checks

**File / place:** Supabase SQL editor.

Add constraints and safeguards:

```sql
alter table competitions
  add constraint valid_competition_dates
  check (ends_at > starts_at);

alter table competitions
  add constraint positive_max_participants
  check (max_participants is null or max_participants > 0);

alter table competitions
  add constraint non_negative_entry_fee
  check (entry_fee >= 0);
```

Add capacity check trigger on `session_participants` so competitions respect `max_participants`:

```sql
create or replace function check_competition_capacity()
returns trigger as $$
declare
  v_max_participants integer;
  v_current_count integer;
  v_competition_id uuid;
begin
  select id, max_participants
  into v_competition_id, v_max_participants
  from competitions
  where session_id = new.session_id;
  
  if v_competition_id is not null and v_max_participants is not null then
    select count(*)
    into v_current_count
    from session_participants
    where session_id = new.session_id
      and status = 'active'
      and user_id != new.user_id;
    
    if v_current_count >= v_max_participants then
      raise exception 'Competition is full (max % participants)', v_max_participants;
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger check_competition_capacity_trigger
  before insert on session_participants
  for each row
  execute function check_competition_capacity();
```

Report: `Competition validation added ✓`

---

## Task 21: Auto-Update Competition Status

**File / place:** Supabase SQL editor.

```sql
create or replace function update_competition_status()
returns void as $$
begin
  update competitions
  set status = 'active',
      updated_at = now()
  where status = 'upcoming'
    and starts_at <= now();
  
  update competitions
  set status = 'ended',
      updated_at = now()
  where status = 'active'
    and ends_at <= now();
    
  update sessions s
  set is_active = false,
      ended_at = now()
  from competitions c
  where s.id = c.session_id
    and c.status = 'ended'
    and s.is_active = true;
end;
$$ language plpgsql;
```

Call this from the app on competition pages, or schedule via cron / external job.

Report: `Competition status auto-update added ✓`

---

## Task 22: End-to-End Testing Scenario

Scenario: **Weekend Bass Tournament**

Host (User A):
- Create a heaviest-fish competition over the weekend.
- Confirm yellow competition visuals.

Participants (Users B/C):
- Join competition.
- Log catches into the competition session.
- Verify leaderboard updates and rankings.
- Verify participant and catch counts.

Visual checks:
- Competition sessions: yellow/gold theme.
- Regular sessions: green/emerald theme.
- Map markers, feed badges, banners all distinguish competitions.

Report: `Rebuild Competitions as Collaborative Sessions Complete ✅`

---

## Success Criteria

- Competitions are implemented as collaborative sessions.
- Users join once and log catches freely during the window.
- Leaderboard is computed from catch data, in real-time.
- Eligibility logic is simple and based on the competition session.
- Visual distinction between competitions (yellow/gold) and regular sessions (green) is clear and consistent.
- Mobile and desktop work.
- No major errors or data loss during migration.
