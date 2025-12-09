---
description: Build the gamification system (XP, Levels, Challenges, Weekly Species Points)
---

# Build Gamification System

## Overview
Turn TheSwim into "Pokémon meets Fantasy Football for Fishing" with:
- XP & Leveling system
- Lifetime Challenge Board (50+ challenges)
- Weekly Species Points (rotating meta)
- Leaderboards (friends-first, casual-friendly)

## Phase 1: Database & Backend

### Step 1: Run Migration
// turbo
```bash
# Copy the SQL from supabase/migrations/20251209100000_gamification_system.sql
# and run it in Supabase Dashboard > SQL Editor
```

### Step 2: Verify Tables Created
Check these tables exist in Supabase:
- `challenges` (50 seeded challenges)
- `user_challenges` (user progress)
- `weekly_species_points` (14 species seeded)
- `user_weekly_stats` (weekly tracking)
- `xp_transactions` (XP history)

Check these columns added to `profiles`:
- `xp` (integer, default 0)
- `level` (integer, default 1)
- `total_challenges_completed` (integer, default 0)

## Phase 2: React Hooks

### Step 3: Create useGamification hook
Create `src/hooks/useGamification.ts`:
- `useUserXP()` - fetch user's XP and level
- `useChallenges()` - fetch all challenges
- `useUserChallenges()` - fetch user's challenge progress
- `useWeeklySpeciesPoints()` - fetch this week's species values
- `useWeeklyLeaderboard()` - fetch weekly rankings
- `useAwardXP()` - mutation to award XP

### Step 4: Create useChallengeProgress hook
Create `src/hooks/useChallengeProgress.ts`:
- Check challenge completion on catch/session/comment
- Auto-update progress
- Trigger completion celebrations

## Phase 3: UI Components

### Step 5: Create XP Bar Component
Create `src/components/gamification/XPBar.tsx`:
- Shows current XP / XP needed for next level
- Animated progress bar
- Level badge display

### Step 6: Create Level Badge Component
Create `src/components/gamification/LevelBadge.tsx`:
- Circular badge with level number
- Color varies by level tier (bronze/silver/gold/platinum)
- Used on profiles and leaderboards

### Step 7: Create Challenge Card Component
Create `src/components/gamification/ChallengeCard.tsx`:
- Shows challenge icon, title, description
- Progress bar for incremental challenges
- Completed state with checkmark
- Difficulty indicator (easy/medium/hard/legendary)

### Step 8: Create Challenge Board Page
Create `src/pages/ChallengeBoardPage.tsx`:
- Grid of all challenges grouped by category
- Filter by category
- Show completed count
- "Challenge of the Month" featured section

### Step 9: Create Weekly Species Card
Create `src/components/gamification/WeeklySpeciesCard.tsx`:
- Shows this week's species + point values
- Highlights bonus species
- "X days left this week" countdown

### Step 10: Create Leaderboard Component
Create `src/components/gamification/Leaderboard.tsx`:
- Tabs: Friends / This Week / All Time
- Shows rank, avatar, name, points
- Highlights current user's position
- "Top 30%" style messaging for non-top users

## Phase 4: Integration

### Step 11: Add XP Awards to Catch Logging
Update catch creation to:
- Award 20 XP per catch
- Award 30 XP bonus if photo attached
- Award species points based on weekly values
- Check and update challenge progress

### Step 12: Add XP Awards to Session Logging
Update session creation to:
- Award 10 XP per session
- Track fishing days for weekly stats

### Step 13: Add XP Awards to Social Actions
Update social actions to:
- Award 5 XP per comment
- Award 2 XP per like given
- Check social challenge progress

### Step 14: Add Level-Up Celebration
Create celebration modal/toast when user levels up:
- Confetti animation
- "Level X Reached!" message
- Show new level badge

### Step 15: Add Challenge Completion Celebration
Create celebration when challenge completed:
- Badge unlock animation
- "+X XP" floating text
- Sound effect (optional)

## Phase 5: Profile Integration

### Step 16: Update Profile Page
Add to profile:
- XP bar under avatar
- Level badge
- "X challenges completed" stat
- Top 3 recent badges showcase
- Link to full Challenge Board

### Step 17: Update Profile Header
Show level badge next to username everywhere:
- Feed posts
- Comments
- Leaderboards
- Session cards

## Phase 6: Navigation & Discovery

### Step 18: Add Challenges to Hub
Add "Challenges" card to Hub page:
- Shows progress (23/50 completed)
- Featured challenge of the month
- Quick link to Challenge Board

### Step 19: Add Weekly Species to Explore
Add "This Week's Species" card to Explore page:
- Shows top 5 species + points
- Link to full list

### Step 20: Add Leaderboard to Hub
Add "Leaderboard" card to Hub:
- Shows top 3 this week
- User's current rank
- Link to full leaderboard

## XP Values Reference

| Action | XP |
|--------|-----|
| Log session | +10 |
| Log catch | +20 |
| Add photo to catch | +30 |
| First catch of day | +15 bonus |
| Comment | +5 |
| Like given | +2 |
| Challenge completed | varies (25-1000) |

## Level Progression

| Level | Total XP Needed |
|-------|-----------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 450 |
| 5 | 700 |
| 10 | 2,750 |
| 20 | 10,500 |
| 50 | 63,750 |

## Challenge Categories

- **Milestones**: Catch counts (1, 10, 50, 100, 500, 1000)
- **Species**: Catch specific species + variety counts
- **Time**: Early bird, night owl, midnight angler
- **Exploration**: Location counts, water types
- **Conditions**: Weather warrior, wind rider
- **Social**: Comments, followers
- **Competition**: Enter, podium, win
- **Skill**: Multi-species, photos, PBs, specimen weights
- **Sessions**: Session counts, marathon sessions

## Testing Checklist

- [ ] XP awards correctly on catch
- [ ] XP awards correctly on session
- [ ] Level calculates correctly
- [ ] Challenge progress updates
- [ ] Challenge completion triggers celebration
- [ ] Weekly species points display
- [ ] Leaderboard shows correct rankings
- [ ] Profile shows XP/level/badges
- [ ] Level-up celebration works
