-- Trigger function to auto-create a session when a competition is created
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
    status
  ) VALUES (
    new_session_id,
    NEW.created_by,
    'owner',
    'active'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that runs BEFORE INSERT on competitions
DROP TRIGGER IF EXISTS competition_session_trigger ON competitions;
CREATE TRIGGER competition_session_trigger
  BEFORE INSERT ON competitions
  FOR EACH ROW
  EXECUTE FUNCTION create_competition_session();
