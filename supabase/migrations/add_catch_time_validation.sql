-- Migration: Catch time validation for competitions
-- Description: Enforces strict time boundaries - catches can only be logged during competition timeframe

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
  join sessions s on s.competition_id = c.id
  where s.id = new.session_id;

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

comment on function validate_competition_catch_time is 
  'Enforces competition time boundaries - catches must be logged during competition period';
