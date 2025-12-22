-- Fix the competition session trigger to include joined_at column
-- which now has a NOT NULL constraint

CREATE OR REPLACE FUNCTION create_competition_session()
RETURNS TRIGGER AS $$
DECLARE
  new_session_id uuid;
BEGIN
  -- Create a session for this competition
  INSERT INTO sessions (
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
  ) VALUES (
    NEW.created_by,
    NEW.title,
    COALESCE(NEW.location_name, 'Competition Location'),
    NEW.location_lat,
    NEW.location_lng,
    NEW.water_type,
    NEW.starts_at,
    NEW.ends_at,
    CASE WHEN NEW.status = 'active' THEN true ELSE false END,
    NEW.id
  )
  RETURNING id INTO new_session_id;

  -- Update the competition with the session_id
  NEW.session_id := new_session_id;

  -- Add the creator as owner participant of the session
  INSERT INTO session_participants (
    session_id,
    user_id,
    role,
    status,
    joined_at
  ) VALUES (
    new_session_id,
    NEW.created_by,
    'owner',
    'active',
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
