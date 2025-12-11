-- Migration: Auto-validation trigger for catches
-- Description: Automatically sets validation_status to 'pending' for competition catches, 'approved' for normal session catches

-- Function: Auto-approve non-competition catches
create or replace function auto_approve_non_competition_catch()
returns trigger as $$
begin
  -- Check if session is a competition
  if exists (
    select 1 from sessions s 
    where s.id = new.session_id 
      and s.competition_id is not null
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

comment on function auto_approve_non_competition_catch is 
  'Automatically sets validation_status based on whether catch is in a competition session';
