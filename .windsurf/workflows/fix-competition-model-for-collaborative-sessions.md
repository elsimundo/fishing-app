---
description: Fix Competition Model for Collaborative Sessions
---

# Fix Competition Model for Collaborative Sessions

Implements catch validation workflow (pending/approved/rejected), multiple winner categories, adjustable competition end times, strict time enforcement, and proper visibility rules where users see their own pending catches but only others' approved catches on the leaderboard.

## COMPETITION MODEL (Final Vision)

### CORE CONCEPT
- Competition = Special collaborative session
- Multiple participants log catches in real-time
- Organizer validates each catch (approve/reject)
- Live leaderboard shows only approved catches
- Multiple winner categories possible
- Organizer can adjust end time
- Strict time boundaries (catches only during competition)

### USER ROLES
- **Organizer** (created_by): Full control, validates catches, declares winners
- **Competitor** (session_participant): Logs catches, sees own pending + others' approved
- **Viewer**: Sees leaderboard (only approved catches)

### VISIBILITY RULES
- Your pending catches: Visible to you only (with "pending" badge)
- Others' pending catches: Hidden from you
- Approved catches: Visible to everyone on leaderboard
- Rejected catches: Hidden from leaderboard, kept in DB, can be reinstated

---

## PHASE 1: CATCH VALIDATION SYSTEM

### Task 1: Audit Current Database Schema

Check existing structure:
- competitions table (with session_id FK)
- sessions table (with competition_id FK)
- catches table (check for validation fields)
- session_participants table (roles: owner/contributor/viewer)

Report current state:
- "competitions.session_id exists: [yes/no]"
- "sessions.competition_id exists: [yes/no]"
- "catches.validation_status exists: [yes/no]"
- "create_competition_session() trigger exists: [yes/no]"

### Task 2: Add Validation Fields to Catches Table

```sql
-- Add validation fields
alter table catches add column if not exists validation_status text 
  check (validation_status in ('pending', 'approved', 'rejected'))
  default 'approved'; -- Default approved for non-competition catches

alter table catches add column if not exists validated_by uuid references profiles(id);
alter table catches add column if not exists validated_at timestamptz;
alter table catches add column if not exists rejection_reason text;
alter table catches add column if not exists time_override_approved boolean default false;
alter table catches add column if not exists time_override_by uuid references profiles(id);

-- Indexes for performance
create index if not exists idx_catches_validation_status 
  on catches(validation_status);
  
create index if not exists idx_catches_session_validation 
  on catches(session_id, validation_status);

-- Comment for clarity
comment on column catches.validation_status is 
  'pending = awaiting organizer approval, approved = counts on leaderboard, rejected = hidden';
```

### Task 3: Create Auto-Validation Trigger

```sql
-- Function: Auto-approve non-competition catches
create or replace function auto_approve_non_competition_catch()
returns trigger as $$
begin
  -- Check if session is a competition
  if exists (
    select 1 from competitions c 
    where c.session_id = new.session_id
  ) then
    -- It's a competition catch - default to pending
    new.validation_status = 'pending';
  else
    -- Normal session - auto-approve
    new.validation_status = 'approved';
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Trigger on insert
drop trigger if exists catch_auto_approve on catches;
create trigger catch_auto_approve
  before insert on catches
  for each row 
  execute function auto_approve_non_competition_catch();
```

### Task 4: Create Catch Time Validation Function

```sql
-- Function: Validate catch is within competition timeframe
create or replace function validate_competition_catch_time()
returns trigger as $$
declare
  v_competition record;
begin
  -- Get competition details if this is a competition session
  select c.id, c.starts_at, c.ends_at, c.title
  into v_competition
  from competitions c
  where c.session_id = new.session_id;

  -- If not a competition, allow any time
  if not found then
    return new;
  end if;

  -- If time override is approved, allow it
  if new.time_override_approved then
    return new;
  end if;

  -- Validate timing
  if new.created_at < v_competition.starts_at then
    raise exception 'Cannot log catch before competition starts. Competition "%" starts at %', 
      v_competition.title, v_competition.starts_at;
  end if;

  if new.created_at > v_competition.ends_at then
    raise exception 'Cannot log catch after competition ends. Competition "%" ended at %', 
      v_competition.title, v_competition.ends_at;
  end if;

  return new;
end;
$$ language plpgsql;

-- Trigger on insert and update
drop trigger if exists validate_catch_time on catches;
create trigger validate_catch_time
  before insert or update of created_at on catches
  for each row 
  execute function validate_competition_catch_time();
```

### Task 5: Create Approve Catch RPC Function

```sql
-- Function: Organizer approves a catch
create or replace function approve_catch(
  p_catch_id uuid,
  p_organizer_id uuid
)
returns jsonb as $$
declare
  v_catch record;
  v_competition_id uuid;
  v_is_organizer boolean;
begin
  -- Get catch and verify it's in a competition
  select c.*, s.competition_id
  into v_catch
  from catches c
  join sessions s on s.id = c.session_id
  where c.id = p_catch_id;

  if not found then
    raise exception 'Catch not found';
  end if;

  if v_catch.competition_id is null then
    raise exception 'Catch is not part of a competition';
  end if;

  -- Verify caller is organizer
  select exists(
    select 1 from competitions 
    where id = v_catch.competition_id and created_by = p_organizer_id
  ) into v_is_organizer;

  if not v_is_organizer then
    raise exception 'Only competition organizer can approve catches';
  end if;

  -- Approve the catch
  update catches
  set 
    validation_status = 'approved',
    validated_by = p_organizer_id,
    validated_at = now(),
    rejection_reason = null
  where id = p_catch_id;

  -- Return updated catch
  return jsonb_build_object(
    'catch_id', p_catch_id,
    'status', 'approved',
    'validated_at', now()
  );
end;
$$ language plpgsql security definer;

grant execute on function approve_catch(uuid, uuid) to authenticated;
```

### Task 6: Create Reject Catch RPC Function

```sql
-- Function: Organizer rejects a catch
create or replace function reject_catch(
  p_catch_id uuid,
  p_organizer_id uuid,
  p_reason text
)
returns jsonb as $$
declare
  v_catch record;
  v_is_organizer boolean;
begin
  -- Get catch and verify it's in a competition
  select c.*, s.competition_id
  into v_catch
  from catches c
  join sessions s on s.id = c.session_id
  where c.id = p_catch_id;

  if not found then
    raise exception 'Catch not found';
  end if;

  if v_catch.competition_id is null then
    raise exception 'Catch is not part of a competition';
  end if;

  -- Verify caller is organizer
  select exists(
    select 1 from competitions 
    where id = v_catch.competition_id and created_by = p_organizer_id
  ) into v_is_organizer;

  if not v_is_organizer then
    raise exception 'Only competition organizer can reject catches';
  end if;

  -- Reject the catch
  update catches
  set 
    validation_status = 'rejected',
    validated_by = p_organizer_id,
    validated_at = now(),
    rejection_reason = p_reason
  where id = p_catch_id;

  -- Return updated catch
  return jsonb_build_object(
    'catch_id', p_catch_id,
    'status', 'rejected',
    'reason', p_reason,
    'validated_at', now()
  );
end;
$$ language plpgsql security definer;

grant execute on function reject_catch(uuid, uuid, text) to authenticated;
```

### Task 7: Update Leaderboard to Only Count Approved Catches

Modify `get_competition_leaderboard` function to add `and c.validation_status = 'approved'` to all WHERE clauses in all competition type branches (heaviest_fish, most_catches, species_diversity).

---

## PHASE 2: MULTIPLE WINNERS SYSTEM

### Task 8: Create Competition Winners Table

```sql
-- Table: Track multiple winners per competition
create table if not exists competition_winners (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  category text not null,
  catch_id uuid references catches(id) on delete set null,
  notes text,
  declared_at timestamptz not null default now(),
  declared_by uuid not null references profiles(id),
  
  unique(competition_id, user_id, category)
);

create index idx_competition_winners_competition on competition_winners(competition_id);
create index idx_competition_winners_user on competition_winners(user_id);

alter table competition_winners enable row level security;

create policy "Winners visible to all" on competition_winners for select using (true);

create policy "Only organizer can declare winners" on competition_winners for insert
  with check (
    exists (
      select 1 from competitions c
      where c.id = competition_winners.competition_id and c.created_by = auth.uid()
    )
  );

create policy "Only organizer can modify winners" on competition_winners for all
  using (
    exists (
      select 1 from competitions c
      where c.id = competition_winners.competition_id and c.created_by = auth.uid()
    )
  );
```

### Task 9: Create Declare Winner RPC Function

```sql
create or replace function declare_competition_winner(
  p_competition_id uuid,
  p_organizer_id uuid,
  p_winner_user_id uuid,
  p_category text,
  p_catch_id uuid default null,
  p_notes text default null
)
returns uuid as $$
declare
  v_winner_id uuid;
  v_is_organizer boolean;
begin
  select exists(
    select 1 from competitions 
    where id = p_competition_id and created_by = p_organizer_id
  ) into v_is_organizer;

  if not v_is_organizer then
    raise exception 'Only competition organizer can declare winners';
  end if;

  if not exists(
    select 1 from competitions c
    join session_participants sp on sp.session_id = c.session_id
    where c.id = p_competition_id and sp.user_id = p_winner_user_id
  ) then
    raise exception 'Winner must be a competition participant';
  end if;

  insert into competition_winners (
    competition_id, user_id, category, catch_id, notes, declared_by
  ) values (
    p_competition_id, p_winner_user_id, p_category, p_catch_id, p_notes, p_organizer_id
  )
  on conflict (competition_id, user_id, category) 
  do update set
    catch_id = excluded.catch_id,
    notes = excluded.notes,
    declared_at = now(),
    declared_by = excluded.declared_by
  returning id into v_winner_id;

  return v_winner_id;
end;
$$ language plpgsql security definer;

grant execute on function declare_competition_winner(uuid, uuid, uuid, text, uuid, text) to authenticated;
```

### Task 10: Create Remove Winner RPC Function

```sql
create or replace function remove_competition_winner(
  p_winner_id uuid,
  p_organizer_id uuid
)
returns void as $$
declare
  v_competition_id uuid;
  v_is_organizer boolean;
begin
  select competition_id into v_competition_id
  from competition_winners where id = p_winner_id;

  if not found then
    raise exception 'Winner declaration not found';
  end if;

  select exists(
    select 1 from competitions 
    where id = v_competition_id and created_by = p_organizer_id
  ) into v_is_organizer;

  if not v_is_organizer then
    raise exception 'Only competition organizer can remove winners';
  end if;

  delete from competition_winners where id = p_winner_id;
end;
$$ language plpgsql security definer;

grant execute on function remove_competition_winner(uuid, uuid) to authenticated;
```

---

## PHASE 3: ADJUSTABLE COMPETITION TIME

### Task 11: Add Time Adjustment Fields

```sql
alter table competitions add column if not exists original_ends_at timestamptz;
alter table competitions add column if not exists time_adjusted_count int default 0;
alter table competitions add column if not exists last_adjusted_at timestamptz;
alter table competitions add column if not exists last_adjusted_by uuid references profiles(id);
```

### Task 12: Create Adjust Competition Time RPC Function

```sql
create or replace function adjust_competition_time(
  p_competition_id uuid,
  p_organizer_id uuid,
  p_new_ends_at timestamptz,
  p_reason text default null
)
returns jsonb as $$
declare
  v_competition record;
begin
  select * into v_competition from competitions where id = p_competition_id;

  if not found then
    raise exception 'Competition not found';
  end if;

  if v_competition.created_by != p_organizer_id then
    raise exception 'Only competition organizer can adjust time';
  end if;

  if p_new_ends_at <= v_competition.starts_at then
    raise exception 'End time must be after start time';
  end if;

  if v_competition.original_ends_at is null then
    update competitions set original_ends_at = ends_at where id = p_competition_id;
  end if;

  update competitions
  set 
    ends_at = p_new_ends_at,
    time_adjusted_count = time_adjusted_count + 1,
    last_adjusted_at = now(),
    last_adjusted_by = p_organizer_id
  where id = p_competition_id;

  update sessions set ended_at = p_new_ends_at where competition_id = p_competition_id;

  return jsonb_build_object(
    'competition_id', p_competition_id,
    'new_ends_at', p_new_ends_at,
    'original_ends_at', v_competition.original_ends_at,
    'adjusted_count', v_competition.time_adjusted_count + 1,
    'reason', p_reason
  );
end;
$$ language plpgsql security definer;

grant execute on function adjust_competition_time(uuid, uuid, timestamptz, text) to authenticated;
```

---

## PHASE 4-7: FRONTEND IMPLEMENTATION

See full workflow for:
- React hooks for pending catches, validation, winners, time adjustment
- UI components: PendingCatchesPanel, MyCatchesWithStatus, WinnersDisplay, DeclareWinnerModal, AdjustTimeModal
- CompetitionDetailPage integration with tabs
- Comprehensive testing scenarios

---

## SUCCESS CRITERIA

✅ Catch validation system operational  
✅ Visibility rules enforced (users see own pending, only others' approved)  
✅ Multiple winners supported  
✅ Time adjustment functional  
✅ Strict time enforcement  
✅ Organizer controls working  
✅ Leaderboard only shows approved catches  
✅ All tests pass  
✅ Mobile responsive  
✅ Production-ready

**COMPETITION MODEL FIXED ✅**
