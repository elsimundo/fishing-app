-- Verify database still shows level 1
SELECT id, username, xp, level, updated_at
FROM profiles
WHERE id = 'c4b9f8aa-5d78-4598-a129-ea5afe068b9f';

-- If this shows level 1, the issue is browser cache
-- If this shows level 3, the database was reverted somehow
