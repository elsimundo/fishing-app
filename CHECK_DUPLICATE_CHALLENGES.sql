-- Check for duplicate challenges in the database

-- 1. Check for duplicate slugs (should be unique)
SELECT slug, COUNT(*) as count
FROM challenges
GROUP BY slug
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Check for duplicate titles
SELECT title, COUNT(*) as count
FROM challenges
GROUP BY title
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 3. Check for challenges with very similar slugs (e.g., with/without year suffix)
SELECT 
  slug,
  title,
  season,
  is_active,
  created_at
FROM challenges
WHERE slug LIKE '%winter%'
ORDER BY slug;

-- 4. Show all challenges grouped by category to spot duplicates
SELECT 
  category,
  slug,
  title,
  season,
  is_active,
  xp_reward
FROM challenges
ORDER BY category, slug;

-- 5. Check for challenges with same title but different slugs
SELECT 
  c1.slug as slug1,
  c2.slug as slug2,
  c1.title,
  c1.is_active as active1,
  c2.is_active as active2
FROM challenges c1
JOIN challenges c2 ON c1.title = c2.title AND c1.id < c2.id
ORDER BY c1.title;
