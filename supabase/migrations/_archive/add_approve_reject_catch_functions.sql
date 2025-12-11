-- Migration: Approve and reject catch RPC functions
-- Description: Allows competition organizers to approve or reject catches

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

comment on function approve_catch is 
  'Allows competition organizer to approve a pending catch';

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

comment on function reject_catch is 
  'Allows competition organizer to reject a catch with a reason';
