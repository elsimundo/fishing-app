-- Migration: Winner management RPC functions
-- Description: Functions for declaring and removing competition winners

-- Function: Organizer declares a winner
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
  -- Verify caller is organizer
  select exists(
    select 1 from competitions 
    where id = p_competition_id and created_by = p_organizer_id
  ) into v_is_organizer;

  if not v_is_organizer then
    raise exception 'Only competition organizer can declare winners';
  end if;

  -- Verify winner is a participant
  if not exists(
    select 1 from competitions c
    join session_participants sp on sp.session_id = c.session_id
    where c.id = p_competition_id and sp.user_id = p_winner_user_id
  ) then
    raise exception 'Winner must be a competition participant';
  end if;

  -- Insert winner (upsert in case of re-declaration)
  insert into competition_winners (
    competition_id, 
    user_id, 
    category, 
    catch_id, 
    notes, 
    declared_by
  ) values (
    p_competition_id, 
    p_winner_user_id, 
    p_category, 
    p_catch_id, 
    p_notes, 
    p_organizer_id
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

grant execute on function declare_competition_winner(uuid, uuid, uuid, text, uuid, text) 
  to authenticated;

comment on function declare_competition_winner is 
  'Allows organizer to declare a winner in a specific category';

-- Function: Organizer removes a winner declaration
create or replace function remove_competition_winner(
  p_winner_id uuid,
  p_organizer_id uuid
)
returns void as $$
declare
  v_competition_id uuid;
  v_is_organizer boolean;
begin
  -- Get competition_id from winner
  select competition_id into v_competition_id
  from competition_winners
  where id = p_winner_id;

  if not found then
    raise exception 'Winner declaration not found';
  end if;

  -- Verify caller is organizer
  select exists(
    select 1 from competitions 
    where id = v_competition_id and created_by = p_organizer_id
  ) into v_is_organizer;

  if not v_is_organizer then
    raise exception 'Only competition organizer can remove winners';
  end if;

  -- Delete winner
  delete from competition_winners where id = p_winner_id;
end;
$$ language plpgsql security definer;

grant execute on function remove_competition_winner(uuid, uuid) to authenticated;

comment on function remove_competition_winner is 
  'Allows organizer to remove a winner declaration';
