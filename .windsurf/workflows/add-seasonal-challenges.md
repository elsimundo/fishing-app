---
description: Add Seasonal Challenges System for Year-Round Engagement
---

# Seasonal Challenges System Implementation

This workflow implements a complete seasonal challenges system to create year-round engagement and hype.

## Overview

Seasonal challenges align with real fishing seasons and create anticipation throughout the year. Players return each season for new exclusive challenges, badges, and rewards.

## Phase 1: Database Foundation

### 1. Add Seasonal Fields to Challenges Table
**Migration:** Add `season` and `event_type` fields
```sql
ALTER TABLE challenges 
ADD COLUMN season TEXT CHECK (season IN ('spring', 'summer', 'autumn', 'winter', 'special', NULL)),
ADD COLUMN event_type TEXT CHECK (event_type IN ('seasonal', 'monthly', 'annual', 'limited', NULL));
```

**Fields:**
- `season`: 'spring' | 'summer' | 'autumn' | 'winter' | 'special' | null
- `event_type`: 'seasonal' | 'monthly' | 'annual' | 'limited' | null

### 2. Update Challenge Type Definition
**File:** `src/hooks/useGamification.ts`
- Add `season` and `event_type` to Challenge interface
- Add helper functions for seasonal filtering

## Phase 2: Create Seasonal Challenge Content

### 3. Define Current Season Challenges
**Based on current date (January = Winter):**

**Winter Warrior Challenges (Dec-Feb):**
1. **Ice Breaker** - Log 5 catches in temperatures below 5°C (Hard, 150 XP)
2. **Winter Warrior** - Complete 10 fishing sessions in winter (Medium, 100 XP)
3. **Cold Water Champion** - Catch 3 different species in winter (Medium, 120 XP)
4. **Festive Fisher** - Log a catch on Christmas Day or New Year's Day (Easy, 50 XP)

**Create SQL insert for winter challenges**

### 4. Plan Full Year of Seasonal Challenges

**Spring Awakening (Mar-May):**
- First Bass of Spring
- Spring Spawner (5 species)
- Dawn Patrol (early morning catches)

**Summer Slam (Jun-Aug):**
- Summer Heatwave (hottest days)
- Night Angler (evening catches)
- Mackerel Madness (20 mackerel)

**Autumn Trophy Season (Sep-Nov):**
- Autumn Giant (PB catches)
- Leaf Fall Fisher (10 locations)
- Pre-Winter Feast (big fish)

**Winter Warrior (Dec-Feb):**
- Ice Breaker (cold weather)
- Winter Warrior (10 sessions)
- Cold Water Champion (3 species)

## Phase 3: UI Enhancements

### 5. Add Seasonal Banner Component
**File:** `src/components/gamification/SeasonalBanner.tsx`
- Show current season
- Countdown to season end
- Featured seasonal challenges
- Seasonal theme colors

### 6. Update ChallengeBoardPage
**Add:**
- Seasonal banner at top
- "Seasonal" filter tab
- Countdown timers on seasonal challenges
- "New This Season" badges
- Seasonal progress tracker

### 7. Add Seasonal Challenge Card Styling
**File:** `src/components/gamification/ChallengeCard.tsx`
- Seasonal border colors
- Season icons (🌸☀️🍂❄️)
- Limited-time indicator
- Countdown badge

## Phase 4: Seasonal Logic & Automation

### 8. Create Seasonal Helper Functions
**File:** `src/utils/seasonalChallenges.ts`
```typescript
- getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter'
- getSeasonDates(season): { start, end }
- isSeasonActive(challenge): boolean
- getSeasonTheme(season): { color, icon, name }
- getSeasonalChallenges(season): Challenge[]
```

### 9. Update Challenge Queries
**File:** `src/hooks/useGamification.ts`
- Add `useSeasonalChallenges()` hook
- Filter by active season
- Sort by ends_at (ending soon first)
- Add countdown logic

### 10. Add Seasonal Notifications
**When new season starts:**
- In-app banner
- Toast notification
- Badge count on Challenges tab

## Phase 5: Seasonal Rewards & Progression

### 11. Add Seasonal Badge System
**Database:**
- Track seasonal challenge completions
- Award seasonal badges
- Store seasonal stats

**UI:**
- Seasonal badge collection
- "Complete all 4 seasons" achievement
- Seasonal leaderboard

### 12. Create Past Seasons Archive
**Page:** `/challenges/seasons`
- View previous seasons
- See completed seasonal challenges
- Seasonal stats & achievements
- Nostalgia factor

## Phase 6: Content Calendar & Management

### 13. Create Seasonal Content Calendar
**Document:** `docs/seasonal-challenges-calendar.md`
- Q1-Q4 challenge schedule
- Special events calendar
- Content creation timeline
- Marketing campaign dates

### 14. Admin Panel for Seasonal Challenges
**Page:** `/admin/seasonal-challenges`
- Create/edit seasonal challenges
- Set season dates
- Preview upcoming seasons
- Activate/deactivate seasons

## Implementation Checklist

**Phase 1: Foundation**
- [ ] Add season & event_type fields to database
- [ ] Update TypeScript types
- [ ] Create migration script

**Phase 2: Content**
- [ ] Create winter challenge set
- [ ] Plan full year of challenges
- [ ] Write challenge descriptions
- [ ] Design seasonal badges

**Phase 3: UI**
- [ ] Build SeasonalBanner component
- [ ] Add seasonal filtering
- [ ] Add countdown timers
- [ ] Style seasonal challenge cards

**Phase 4: Logic**
- [ ] Create seasonal utility functions
- [ ] Add seasonal hooks
- [ ] Implement auto-activation
- [ ] Add notifications

**Phase 5: Rewards**
- [ ] Seasonal badge system
- [ ] Seasonal progression tracking
- [ ] Past seasons archive
- [ ] Seasonal leaderboards

**Phase 6: Management**
- [ ] Content calendar
- [ ] Admin panel
- [ ] Documentation
- [ ] Marketing materials

## Success Metrics

- [ ] Seasonal challenges auto-activate on schedule
- [ ] Users can see current season clearly
- [ ] Countdown timers work correctly
- [ ] Seasonal badges award properly
- [ ] Past seasons are viewable
- [ ] Admin can manage seasons easily

## Launch Strategy

**Soft Launch:**
1. Release Winter Warrior challenges (current season)
2. Monitor engagement for 2 weeks
3. Gather feedback

**Full Launch:**
1. Announce full seasonal system
2. Preview upcoming Spring challenges
3. Email campaign to all users
4. Social media hype

**Ongoing:**
1. New season announcement 1 week before
2. Mid-season bonus challenges
3. End-of-season recap
4. Seasonal leaderboard winners

## Future Enhancements

- Premium seasonal passes (monetization)
- Collaborative seasonal challenges
- Regional seasonal variations
- Seasonal competitions
- Seasonal merchandise
