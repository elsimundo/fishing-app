-- Migration: Adjust competition time RPC function
-- Description: Allows organizer to extend or modify competition end time

-- Function: Organizer adjusts competition end time
create or replace function adjust_competition_time(
  p_competition_id uuid,
  p_organizer_id uuid,
  p_new_ends_at timestamptz,
  p_reason text default null
)
returns jsonb as $$
declare
  v_competition record;
  v_is_organizer boolean;
begin
  -- Get competition
  select * into v_competition
  from competitions
  where id = p_competition_id;

  if not found then
    raise exception 'Competition not found';
  end if;

  -- Verify caller is organizer
  if v_competition.created_by != p_organizer_id then
    raise exception 'Only competition organizer can adjust time';
  end if;

  -- Validate new end time is after start time
  if p_new_ends_at <= v_competition.starts_at then
    raise exception 'End time must be after start time';
  end if;

  -- Store original if first adjustment
  if v_competition.original_ends_at is null then
    update competitions
    set original_ends_at = ends_at
    where id = p_competition_id;
  end if;

  -- Update end time
  update competitions
  set 
    ends_at = p_new_ends_at,
    time_adjusted_count = time_adjusted_count + 1,
    last_adjusted_at = now(),
    last_adjusted_by = p_organizer_id
  where id = p_competition_id;

  -- Also update linked session end time
  update sessions
  set ended_at = p_new_ends_at
  where competition_id = p_competition_id;

  -- Return adjustment details
  return jsonb_build_object(
    'competition_id', p_competition_id,
    'new_ends_at', p_new_ends_at,
    'original_ends_at', v_competition.original_ends_at,
    'adjusted_count', v_competition.time_adjusted_count + 1,
    'reason', p_reason
  );
end;
$$ language plpgsql security definer;

grant execute on function adjust_competition_time(uuid, uuid, timestamptz, text) 
  to authenticated;

comment on function adjust_competition_time is 
  'Allows organizer to adjust competition end time with reason tracking';
