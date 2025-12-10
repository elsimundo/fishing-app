---
description: Add global and country-scoped challenges with auto-enrollment
---

# Add Global & Country Challenges System

This workflow implements country-scoped challenges with auto-enrollment based on catch location.

## Phase 1: Database Schema

### Step 1: Add country_code to catches table

Create migration `supabase/migrations/20251211_add_country_challenges.sql`:

```sql
-- Add country code to catches for geographic challenge tracking
ALTER TABLE catches
ADD COLUMN IF NOT EXISTS country_code text; -- ISO 3166-1 alpha-2 (e.g., 'GB', 'PT', 'FR')

-- Index for efficient country-based queries
CREATE INDEX IF NOT EXISTS idx_catches_country_code ON catches(country_code) WHERE country_code IS NOT NULL;

-- Add scope fields to challenges table
ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'global'; -- 'global' | 'country' | 'region' | 'event'

ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS scope_value text; -- e.g., 'GB', 'PT', 'Essex' (null for global)

ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS scope_countries text[]; -- For multi-country challenges like "European Tour"

-- Add event timing fields for seasonal challenges (Phase 2)
ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS ends_at timestamptz;

-- Comments for documentation
COMMENT ON COLUMN catches.country_code IS 'ISO 3166-1 alpha-2 country code derived from catch location';
COMMENT ON COLUMN challenges.scope IS 'Challenge scope: global (everyone), country (specific country), region (sub-country), event (special criteria)';
COMMENT ON COLUMN challenges.scope_value IS 'Value for scope filtering, e.g., country code GB or region name Essex';
```

Run this migration in Supabase SQL Editor.

### Step 2: Backfill existing catches with country codes

This is optional but recommended. You can do this gradually or skip if you only want new catches to have country data.

```sql
-- Example: Set UK for catches with UK coordinates (rough bounding box)
UPDATE catches
SET country_code = 'GB'
WHERE country_code IS NULL
  AND latitude BETWEEN 49.9 AND 60.9
  AND longitude BETWEEN -8.2 AND 1.8;
```

## Phase 2: Reverse Geocoding Service

### Step 3: Create country lookup utility

Create `src/utils/reverseGeocode.ts`:

```typescript
/**
 * Get country code from coordinates using free reverse geocoding
 * Uses BigDataCloud API (free, no API key required for basic usage)
 */
export async function getCountryFromCoords(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    return data.countryCode || null // Returns ISO 3166-1 alpha-2 (e.g., 'GB', 'PT')
  } catch (error) {
    console.error('Reverse geocode failed:', error)
    return null
  }
}

/**
 * Country code to display name mapping
 */
export const COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom',
  PT: 'Portugal',
  ES: 'Spain',
  FR: 'France',
  DE: 'Germany',
  NL: 'Netherlands',
  BE: 'Belgium',
  IE: 'Ireland',
  IT: 'Italy',
  GR: 'Greece',
  US: 'United States',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  ZA: 'South Africa',
  // Add more as needed
}

export const COUNTRY_FLAGS: Record<string, string> = {
  GB: '🇬🇧',
  PT: '🇵🇹',
  ES: '🇪🇸',
  FR: '🇫🇷',
  DE: '🇩🇪',
  NL: '🇳🇱',
  BE: '🇧🇪',
  IE: '🇮🇪',
  IT: '🇮🇹',
  GR: '🇬🇷',
  US: '🇺🇸',
  CA: '🇨🇦',
  AU: '🇦🇺',
  NZ: '🇳🇿',
  ZA: '🇿🇦',
}
```

### Step 4: Update catch creation to include country code

In `src/hooks/useCatches.ts`, update the `createCatch` mutation to:

1. Accept latitude/longitude
2. Call `getCountryFromCoords()` to get country code
3. Include `country_code` in the insert

```typescript
// In createCatch mutation:
const countryCode = (latitude && longitude) 
  ? await getCountryFromCoords(latitude, longitude)
  : null

const { data, error } = await supabase
  .from('catches')
  .insert({
    // ... existing fields
    country_code: countryCode,
  })
```

## Phase 3: Challenge Scoping

### Step 5: Update useChallenges hook

Modify `src/hooks/useGamification.ts` to support scoped challenges:

```typescript
interface UseChallengesOptions {
  waterType?: 'freshwater' | 'saltwater'
  scope?: 'global' | 'country' | 'all'
  countryCode?: string // Filter to specific country
}

export function useChallenges(options: UseChallengesOptions = {}) {
  const { waterType, scope = 'all', countryCode } = options
  
  return useQuery({
    queryKey: ['challenges', waterType, scope, countryCode],
    queryFn: async () => {
      let query = supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
      
      if (waterType) {
        query = query.or(`water_type.eq.${waterType},water_type.is.null`)
      }
      
      if (scope === 'global') {
        query = query.eq('scope', 'global')
      } else if (scope === 'country' && countryCode) {
        query = query.eq('scope', 'country').eq('scope_value', countryCode)
      }
      
      const { data, error } = await query.order('sort_order')
      if (error) throw error
      return data
    },
  })
}
```

### Step 6: Update challenge progress checking

In `src/hooks/useCatchXP.ts`, update `checkChallenges()` to:

1. Get the catch's country code
2. For country-scoped challenges, only count catches from that country
3. For global challenges, count all catches

```typescript
// When checking milestone challenges:
const { count: totalCatches } = await supabase
  .from('catches')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('country_code', challenge.scope_value) // Only for country challenges
```

## Phase 4: UI Updates

### Step 7: Update ChallengeBoardPage

Add country filter tabs and show country-specific challenges:

```tsx
// In ChallengeBoardPage.tsx

// Detect user's primary country from their catches
const { data: userCountries } = useQuery({
  queryKey: ['user-countries'],
  queryFn: async () => {
    const { data } = await supabase
      .from('catches')
      .select('country_code')
      .eq('user_id', user?.id)
      .not('country_code', 'is', null)
    
    // Count catches per country
    const counts: Record<string, number> = {}
    data?.forEach(c => {
      counts[c.country_code] = (counts[c.country_code] || 0) + 1
    })
    
    // Sort by count descending
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => code)
  },
})

// Show tabs: Global | 🇬🇧 UK | 🇵🇹 Portugal | etc.
```

### Step 8: Create country leaderboard component

Create `src/components/gamification/CountryLeaderboard.tsx`:

```tsx
interface CountryLeaderboardProps {
  countryCode: string
  limit?: number
}

export function CountryLeaderboard({ countryCode, limit = 10 }: CountryLeaderboardProps) {
  const { data: leaderboard } = useQuery({
    queryKey: ['country-leaderboard', countryCode],
    queryFn: async () => {
      // Get top users by catch count in this country
      const { data } = await supabase
        .from('catches')
        .select('user_id, profiles!inner(username, avatar_url)')
        .eq('country_code', countryCode)
        .not('photo_url', 'is', null) // Only verified catches
      
      // Aggregate by user
      const userCounts: Record<string, { count: number; profile: any }> = {}
      data?.forEach(c => {
        if (!userCounts[c.user_id]) {
          userCounts[c.user_id] = { count: 0, profile: c.profiles }
        }
        userCounts[c.user_id].count++
      })
      
      return Object.entries(userCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, limit)
        .map(([userId, data], index) => ({
          rank: index + 1,
          userId,
          ...data,
        }))
    },
  })
  
  // Render leaderboard UI...
}
```

## Phase 5: Seed Country Challenges

### Step 9: Insert initial country challenges

```sql
-- Insert country challenges
INSERT INTO challenges (slug, name, description, scope, scope_value, category, xp_reward, icon, is_active)
VALUES
  ('uk_explorer', 'UK Explorer', 'Catch 10 fish in the United Kingdom', 'country', 'GB', 'exploration', 100, '🇬🇧', true),
  ('uk_species_master', 'UK Species Master', 'Catch 10 different species in the UK', 'country', 'GB', 'species', 200, '🇬🇧', true),
  ('portugal_explorer', 'Portugal Explorer', 'Catch 10 fish in Portugal', 'country', 'PT', 'exploration', 100, '🇵🇹', true),
  ('france_explorer', 'France Explorer', 'Catch 10 fish in France', 'country', 'FR', 'exploration', 100, '🇫🇷', true),
  ('spain_explorer', 'Spain Explorer', 'Catch 10 fish in Spain', 'country', 'ES', 'exploration', 100, '🇪🇸', true),
  ('world_traveler', 'World Traveler', 'Fish in 5 different countries', 'event', NULL, 'exploration', 500, '🌍', true),
  ('european_tour', 'European Tour', 'Fish in 3 European countries', 'event', NULL, 'exploration', 300, '🇪🇺', true);
```

## Testing Checklist

- [ ] New catches get country_code populated
- [ ] Global challenges still work as before
- [ ] Country challenges only count catches from that country
- [ ] Leaderboards show correct rankings per country
- [ ] UI shows user's active countries
- [ ] World Traveler challenge tracks unique countries

## Future Enhancements (Phase 2)

- [ ] Seasonal events with start/end dates
- [ ] Regional challenges (Essex, Algarve, etc.)
- [ ] Premium events with entry fees
- [ ] Country-specific species challenges
- [ ] "First to X" race challenges
