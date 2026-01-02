# Winter Challenges Display Issue

## Problem
The Winter Warrior seasonal banner shows:
- ❌ "15 months left" (incorrect duration calculation) - **FIXED**
- ❌ "0 Active challenges" (winter challenges not appearing)
- ❌ "Season Progress 0%" (correct, but confusing without challenges)

## Root Cause
1. **Duration Display**: The `formatCountdown()` function was calculating `Math.ceil(450 / 30) = 15 months` instead of properly showing "1 month, 3 weeks left"
   - **Status**: ✅ FIXED in `src/utils/seasonalChallenges.ts`

2. **Missing Challenges**: The winter challenges migration (`20260101000002_insert_winter_challenges.sql`) may not have been run yet
   - **Status**: ⚠️ NEEDS VERIFICATION

## Winter Challenges That Should Appear
From `supabase/migrations/20260101000002_insert_winter_challenges.sql`:

1. **Ice Breaker** (🧊) - Log 5 catches when temp < 5°C - 150 XP
2. **Winter Warrior** (❄️) - Complete 10 sessions in winter - 100 XP
3. **Cold Water Champion** (🐟) - Catch 3 different species in winter - 120 XP
4. **Festive Fisher** (🎄) - Log catch on Christmas or New Year - 50 XP
5. **Winter Night Owl** (🌙) - Log 5 catches after sunset in winter - 110 XP
6. **Winter Explorer** (🗺️) - Fish at 5 different locations in winter - 80 XP

All challenges:
- Season: `winter`
- Dates: `2025-12-01` to `2026-02-28`
- Scope: `global`
- Active: `true`

## Solution

### 1. Run the Migration
```bash
# In Supabase SQL Editor, run:
# File: supabase/migrations/20260101000002_insert_winter_challenges.sql
```

### 2. Verify Challenges Exist
```sql
SELECT slug, title, season, is_active, starts_at, ends_at 
FROM challenges 
WHERE season = 'winter' 
ORDER BY sort_order;
```

### 3. Improve Banner Clarity
The "Winter Warrior" banner is actually the **seasonal overview**, not a challenge card. Consider:
- Adding text like "Winter Season" or "Current Season"
- Making it clearer that individual challenges appear below
- Adding a "View Challenges" button that scrolls to the challenge list

## Files Changed
- ✅ `src/utils/seasonalChallenges.ts` - Fixed countdown calculation
- 📝 `supabase/migrations/20260101000002_insert_winter_challenges.sql` - Needs to be run
