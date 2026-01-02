# Winter Challenges Debug Guide

## Issue
Winter challenges were inserted via SQL but aren't showing up in the UI.

## Steps to Debug

### 1. Check Browser Console
After refreshing the page, check the browser console for the debug log:
```
🔍 Challenge Debug: {
  currentSeason: 'winter',
  totalChallenges: X,
  filteredChallenges: Y,
  seasonalChallengesCount: 0,
  winterChallenges: [...],
  allSeasons: [...]
}
```

### 2. What to Look For

**If `winterChallenges` is empty:**
- The SQL migration didn't insert the challenges
- Run the migration again in Supabase SQL Editor
- Check for errors in the SQL output

**If `winterChallenges` has data but `seasonalChallengesCount` is 0:**
- Challenges are being filtered out
- Check the `scopeTab` and `selectedCategory` filters
- Check water type filter (saltwater vs freshwater)

**If `allSeasons` doesn't include 'winter':**
- Challenges exist but season field is null or different
- Check the database: `SELECT slug, season FROM challenges WHERE slug LIKE 'winter%';`

### 3. Quick Fixes

**Force refresh React Query cache:**
```javascript
// In browser console
localStorage.clear()
location.reload()
```

**Check database directly:**
```sql
SELECT slug, title, season, is_active, water_type, scope 
FROM challenges 
WHERE season = 'winter' 
ORDER BY sort_order;
```

**Expected results:** 6 challenges with slugs:
- winter_ice_breaker_2026
- winter_warrior_2026
- winter_cold_water_champion_2026
- winter_festive_fisher_2026
- winter_night_owl_2026
- winter_explorer_2026

### 4. Common Issues

1. **Water Type Filter**: Winter challenges have `water_type = 'both'`
   - If you're on "Saltwater" or "Freshwater" tab, they should still show
   - Check the query in `useGamification.ts` line 216

2. **Scope Filter**: Winter challenges have `scope = 'global'`
   - If you're on "Countries" or "Events" tab, they won't show
   - Switch to "All" or "Everyone" tab

3. **Category Filter**: Winter challenges have various categories
   - If you're filtering by specific category, some won't show
   - Switch to "All" categories

4. **React Query Cache**: Even with `staleTime: 0`, browser might cache
   - Do hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Clear localStorage and reload

## Files Changed
- ✅ `src/utils/seasonalChallenges.ts` - Fixed winter date calculation
- ✅ `src/hooks/useGamification.ts` - Set staleTime to 0
- ✅ `src/pages/ChallengeBoardPage.tsx` - Added debug logging
