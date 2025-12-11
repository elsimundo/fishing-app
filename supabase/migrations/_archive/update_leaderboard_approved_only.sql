-- Migration: Update leaderboard to only count approved catches
-- Description: Modifies get_competition_leaderboard to filter by validation_status = 'approved'

create or replace function get_competition_leaderboard(p_competition_id uuid)
returns table(
  rank bigint,
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  score numeric,
  catch_count bigint,
  best_catch_id uuid,
  best_species text,
  best_weight numeric,
  best_length numeric,
  best_photo text
) as $$
declare
  v_session_id uuid;
  v_type text;
  v_allowed_species text[];
begin
  -- Get competition details
  select c.session_id, c.type, c.allowed_species
  into v_session_id, v_type, v_allowed_species
  from competitions c
  where c.id = p_competition_id;

  if not found then
    raise exception 'Competition not found';
  end if;

  if v_session_id is null then
    raise exception 'Competition has no linked session';
  end if;

  -- Type: heaviest_fish
  if v_type = 'heaviest_fish' then
    return query
    select
      row_number() over (order by max(c.weight_kg) desc) as rank,
      p.id as user_id,
      p.username,
      p.full_name,
      p.avatar_url,
      max(c.weight_kg) as score,
      count(c.id) as catch_count,
      (array_agg(c.id order by c.weight_kg desc))[1] as best_catch_id,
      (array_agg(c.species order by c.weight_kg desc))[1] as best_species,
      max(c.weight_kg) as best_weight,
      (array_agg(c.length_cm order by c.weight_kg desc))[1] as best_length,
      (array_agg(c.photo_url order by c.weight_kg desc))[1] as best_photo
    from catches c
    join profiles p on p.id = c.user_id
    where c.session_id = v_session_id
      and c.validation_status = 'approved' -- CRITICAL: Only approved catches
      and (v_allowed_species is null or c.species = any(v_allowed_species))
    group by p.id, p.username, p.full_name, p.avatar_url
    having max(c.weight_kg) is not null
    order by score desc;

  -- Type: most_catches
  elsif v_type = 'most_catches' then
    return query
    select
      row_number() over (order by count(c.id) desc) as rank,
      p.id as user_id,
      p.username,
      p.full_name,
      p.avatar_url,
      count(c.id)::numeric as score,
      count(c.id) as catch_count,
      (array_agg(c.id order by c.created_at desc))[1] as best_catch_id,
      (array_agg(c.species order by c.created_at desc))[1] as best_species,
      (array_agg(c.weight_kg order by c.created_at desc))[1] as best_weight,
      (array_agg(c.length_cm order by c.created_at desc))[1] as best_length,
      (array_agg(c.photo_url order by c.created_at desc))[1] as best_photo
    from catches c
    join profiles p on p.id = c.user_id
    where c.session_id = v_session_id
      and c.validation_status = 'approved' -- CRITICAL
      and (v_allowed_species is null or c.species = any(v_allowed_species))
    group by p.id, p.username, p.full_name, p.avatar_url
    order by score desc;

  -- Type: species_diversity
  elsif v_type = 'species_diversity' then
    return query
    select
      row_number() over (order by count(distinct c.species) desc) as rank,
      p.id as user_id,
      p.username,
      p.full_name,
      p.avatar_url,
      count(distinct c.species)::numeric as score,
      count(c.id) as catch_count,
      (array_agg(c.id order by c.created_at desc))[1] as best_catch_id,
      (array_agg(c.species order by c.created_at desc))[1] as best_species,
      (array_agg(c.weight_kg order by c.created_at desc))[1] as best_weight,
      (array_agg(c.length_cm order by c.created_at desc))[1] as best_length,
      (array_agg(c.photo_url order by c.created_at desc))[1] as best_photo
    from catches c
    join profiles p on p.id = c.user_id
    where c.session_id = v_session_id
      and c.validation_status = 'approved' -- CRITICAL
      and (v_allowed_species is null or c.species = any(v_allowed_species))
    group by p.id, p.username, p.full_name, p.avatar_url
    order by score desc;

  else
    raise exception 'Unknown competition type: %', v_type;
  end if;
end;
$$ language plpgsql security definer;

grant execute on function get_competition_leaderboard(uuid) to authenticated;

comment on function get_competition_leaderboard is 
  'Returns competition leaderboard with only approved catches counted';
