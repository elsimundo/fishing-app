---
description: Connect all challenges to their required data sources (time, weather, moon, sessions, etc.)
---

# Connect Challenges to Data Sources

This workflow ensures all challenge types in the gamification system are properly connected to the data they need to evaluate completion.

## Challenge Types & Data Requirements

### Currently Working ✅
1. **Milestone Challenges** (catch_count, species_count) - Working in `useCatchXP.ts`
2. **Species Challenges** (catch_species) - Working
3. **Photo Challenges** (photo_count) - Working
4. **Location Challenges** (location_count) - Working
5. **Weight Challenges** (catch_weight, specimen_count) - Working
6. **Time Challenges** (catch_time_count) - Partially working (uses `caught_at` hour)
7. **Streak Challenges** (consecutive_weeks, weekend_count) - Working

### Need Connection 🔧
1. **Weather Challenges** - Need `weather_condition` from catch/session
2. **Wind Challenges** - Need `wind_speed` from catch/session
3. **Moon Phase Challenges** - Need `moon_phase` from catch/session (NEW)
4. **Session Duration Challenges** - Need session `started_at`/`ended_at`
5. **Water Type Challenges** - Need session/catch `water_type`
6. **Session Count Challenges** - Need to track sessions
7. **Social Challenges** - Need comment/follower counts
8. **Competition Challenges** - Need competition participation data

---

## Step 1: Add Missing Challenge Types to Database

Add new challenges that use the data we now have:

```sql
-- Run in Supabase SQL Editor
INSERT INTO challenges (slug, title, description, icon, category, difficulty, criteria, xp_reward, sort_order, water_type) VALUES

-- MOON PHASE CHALLENGES
('full_moon_catch', 'Lunar Legend', 'Catch a fish during a full moon', '🌕', 'conditions', 'medium', '{"type": "moon_phase", "phase": "Full Moon"}', 75, 52, 'both'),
('new_moon_catch', 'Dark Side', 'Catch a fish during a new moon', '🌑', 'conditions', 'medium', '{"type": "moon_phase", "phase": "New Moon"}', 75, 53, 'both'),
('moon_master', 'Moon Master', 'Catch fish during 4 different moon phases', '🌙', 'conditions', 'hard', '{"type": "moon_phases_count", "value": 4}', 150, 54, 'both'),

-- WEATHER CHALLENGES (enhanced)
('sunny_fisher', 'Fair Weather Fisher', 'Catch 10 fish on clear/sunny days', '☀️', 'conditions', 'easy', '{"type": "weather_count", "conditions": ["Clear", "Sunny", "Mainly clear"], "value": 10}', 75, 55, 'both'),
('storm_chaser', 'Storm Chaser', 'Catch a fish during a thunderstorm', '⛈️', 'conditions', 'hard', '{"type": "weather_condition", "value": "Thunderstorm"}', 150, 56, 'both'),
('fog_fisher', 'Fog Fisher', 'Catch a fish in foggy conditions', '🌫️', 'conditions', 'medium', '{"type": "weather_condition", "value": "Fog"}', 100, 57, 'both'),

-- SESSION CHALLENGES (enhanced)
('dawn_session', 'Early Start', 'Start a session before 6am', '🌅', 'sessions', 'medium', '{"type": "session_start_time", "before": "06:00"}', 75, 94, 'both'),
('all_day_session', 'All Day Angler', 'Log a session over 12 hours', '🌞', 'sessions', 'hard', '{"type": "session_duration", "min_hours": 12}', 150, 95, 'both'),
('night_session', 'Night Fisher', 'Start a session after 8pm', '🌃', 'sessions', 'medium', '{"type": "session_start_time", "after": "20:00"}', 75, 96, 'both')

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  criteria = EXCLUDED.criteria,
  xp_reward = EXCLUDED.xp_reward,
  updated_at = now();
```

---

## Step 2: Update `useCatchXP.ts` - Add Weather & Moon Checks

Edit `/src/hooks/useCatchXP.ts` to add these challenge checks in the `checkChallenges` function:

### 2a. Add input types for new data

Update `CatchXPInput` interface to include:
```typescript
interface CatchXPInput {
  // ... existing fields
  weatherCondition?: string | null
  windSpeed?: number | null
  moonPhase?: string | null
}
```

### 2b. Add Weather Challenges section (after time-based challenges ~line 304)

```typescript
// ============================================
// 8. WEATHER-BASED CHALLENGES
// ============================================
if (input.weatherCondition) {
  const condition = input.weatherCondition.toLowerCase()
  
  // Weather Warrior: Catch in rain
  if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
    await incrementProgressChallenge(userId, 'weather_warrior', 5, completed)
  }
  
  // Storm Chaser: Catch during thunderstorm
  if (condition.includes('thunder') || condition.includes('storm')) {
    await completeChallenge(userId, 'storm_chaser', 1, 1, completed)
  }
  
  // Fog Fisher: Catch in fog
  if (condition.includes('fog') || condition.includes('mist')) {
    await completeChallenge(userId, 'fog_fisher', 1, 1, completed)
  }
  
  // Sunny Fisher: Catch on clear days
  if (condition.includes('clear') || condition.includes('sunny')) {
    await incrementProgressChallenge(userId, 'sunny_fisher', 10, completed)
  }
}

// Wind Rider: Catch on windy day (15+ mph)
if (input.windSpeed && input.windSpeed >= 15) {
  await incrementProgressChallenge(userId, 'wind_rider', 5, completed)
}
```

### 2c. Add Moon Phase Challenges section

```typescript
// ============================================
// 9. MOON PHASE CHALLENGES
// ============================================
if (input.moonPhase) {
  // Full Moon catch
  if (input.moonPhase === 'Full Moon') {
    await completeChallenge(userId, 'full_moon_catch', 1, 1, completed)
  }
  
  // New Moon catch
  if (input.moonPhase === 'New Moon') {
    await completeChallenge(userId, 'new_moon_catch', 1, 1, completed)
  }
  
  // Track unique moon phases caught
  await checkMoonPhasesChallenge(userId, completed)
}
```

### 2d. Add helper function for moon phases

```typescript
async function checkMoonPhasesChallenge(userId: string, completed: string[]) {
  const { data: catches } = await supabase
    .from('catches')
    .select('moon_phase')
    .eq('user_id', userId)
    .not('moon_phase', 'is', null)
  
  if (!catches) return
  
  const uniquePhases = new Set(catches.map(c => c.moon_phase))
  
  if (uniquePhases.size >= 4) {
    await completeChallenge(userId, 'moon_master', uniquePhases.size, 4, completed)
  }
}
```

---

## Step 3: Update Catch Forms to Pass Data

### 3a. Update `CatchForm.tsx` call to `useCatchXP`

Find where `awardCatchXP` is called and add the new fields:

```typescript
await awardCatchXP({
  catchId: data.id,
  species: values.species,
  weightLb: values.weight_kg ? values.weight_kg * 2.205 : null,
  weightKg: values.weight_kg,
  hasPhoto: !!photoUrl,
  caughtAt: values.caught_at,
  latitude: values.latitude,
  longitude: values.longitude,
  // Add these new fields:
  weatherCondition: weatherCondition,
  windSpeed: windSpeed,
  moonPhase: getMoonPhase().phase,
})
```

### 3b. Update `QuickLogForm.tsx` similarly

Pass session's weather/moon data to the XP function.

---

## Step 4: Add Session-Based Challenge Checks

Create a new hook or function to check session challenges when a session is created/ended:

### 4a. Create `useSessionXP.ts`

```typescript
// Check session-based challenges
export async function checkSessionChallenges(
  userId: string,
  session: { 
    id: string
    started_at: string
    ended_at?: string | null
    water_type?: string | null
  }
) {
  const completed: string[] = []
  
  // Session count challenges
  const { count: sessionCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  
  if (sessionCount && sessionCount >= 1) {
    await completeChallenge(userId, 'first_session', sessionCount, 1, completed)
  }
  if (sessionCount && sessionCount >= 10) {
    await completeChallenge(userId, 'session_10', sessionCount, 10, completed)
  }
  if (sessionCount && sessionCount >= 50) {
    await completeChallenge(userId, 'session_50', sessionCount, 50, completed)
  }
  
  // Session duration challenges (only if ended)
  if (session.ended_at) {
    const start = new Date(session.started_at)
    const end = new Date(session.ended_at)
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    
    if (durationHours >= 8) {
      await completeChallenge(userId, 'marathon_session', 1, 1, completed)
    }
    if (durationHours >= 12) {
      await completeChallenge(userId, 'all_day_session', 1, 1, completed)
    }
  }
  
  // Session start time challenges
  const startHour = new Date(session.started_at).getHours()
  if (startHour < 6) {
    await completeChallenge(userId, 'dawn_session', 1, 1, completed)
  }
  if (startHour >= 20) {
    await completeChallenge(userId, 'night_session', 1, 1, completed)
  }
  
  // Water type challenges
  if (session.water_type === 'saltwater') {
    await completeChallenge(userId, 'sea_legs', 1, 1, completed)
    await completeChallenge(userId, 'saltwater_first', 1, 1, completed)
  }
  if (session.water_type === 'freshwater') {
    await completeChallenge(userId, 'freshwater_fan', 1, 1, completed)
    await completeChallenge(userId, 'freshwater_first', 1, 1, completed)
  }
  
  return completed
}
```

### 4b. Call from session creation

In `StartSessionPage.tsx` and `SessionForm.tsx`, after successful session creation:

```typescript
// After session created successfully
await checkSessionChallenges(user.id, data)
```

---

## Step 5: Add Social Challenge Checks

Create triggers or hooks for social actions:

### 5a. Comments - in comment creation flow

```typescript
async function checkCommentChallenges(userId: string) {
  const { count } = await supabase
    .from('post_comments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  
  if (count && count >= 1) await completeChallenge(userId, 'social_first_comment', count, 1, [])
  if (count && count >= 10) await completeChallenge(userId, 'social_10_comments', count, 10, [])
  if (count && count >= 100) await completeChallenge(userId, 'social_butterfly', count, 100, [])
}
```

### 5b. Followers - in follow action

```typescript
async function checkFollowerChallenges(userId: string) {
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)
  
  if (count && count >= 1) await completeChallenge(userId, 'first_follower', count, 1, [])
  if (count && count >= 50) await completeChallenge(userId, 'influencer', count, 50, [])
}
```

---

## Step 6: Test Each Challenge Type

1. **Weather challenges**: Log a catch with weather data, verify challenge progress
2. **Moon challenges**: Log catches during different moon phases
3. **Session challenges**: Create sessions at different times, check duration
4. **Social challenges**: Add comments, follow users
5. **Time challenges**: Log catches at dawn/dusk/night

---

## Summary of Data Flow

| Challenge Type | Data Source | Where Checked |
|---------------|-------------|---------------|
| Catch count | `catches` table | `useCatchXP.ts` |
| Species | `catches.species` | `useCatchXP.ts` |
| Weight | `catches.weight_kg` | `useCatchXP.ts` |
| Photo | `catches.photo_url` | `useCatchXP.ts` |
| Location | `catches.lat/lng` | `useCatchXP.ts` |
| Time of day | `catches.caught_at` | `useCatchXP.ts` |
| Weather | `catches.weather_condition` | `useCatchXP.ts` (NEW) |
| Wind | `catches.wind_speed` | `useCatchXP.ts` (NEW) |
| Moon phase | `catches.moon_phase` | `useCatchXP.ts` (NEW) |
| Session count | `sessions` table | `useSessionXP.ts` (NEW) |
| Session duration | `sessions.started_at/ended_at` | `useSessionXP.ts` (NEW) |
| Water type | `sessions.water_type` | `useSessionXP.ts` (NEW) |
| Comments | `post_comments` table | Comment hook (NEW) |
| Followers | `follows` table | Follow hook (NEW) |
| Competitions | `competition_entries` | Competition hooks |
