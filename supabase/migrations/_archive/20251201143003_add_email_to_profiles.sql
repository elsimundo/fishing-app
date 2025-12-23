-- Add email column to profiles for friend lookup / sharing

ALTER TABLE profiles
ADD COLUMN email text;

-- Optional: if you know some user emails, you can backfill them manually later.