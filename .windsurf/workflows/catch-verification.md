---
description: Catch verification system - how catches are verified for XP and badges
---

# Catch Verification System

## Overview

For catches to count towards XP and badges, they must be verified. Verification uses a scoring system based on multiple signals from photos, metadata, location, and AI analysis.

**Key Files:**
- `supabase/migrations/20251218160000_catch_verification.sql` - DB schema & functions
- `src/hooks/useVerification.ts` - React hooks for verification
- `src/hooks/useCatchXP.ts` - XP system with verification integration
- `src/components/catches/VerificationBadge.tsx` - UI badges
- `src/components/catches/VerificationFeedback.tsx` - Detailed feedback UI
- `src/pages/ChallengeRulesPage.tsx` - User-facing documentation

## Verification Levels

| Level | Score | XP Multiplier | Requirements |
|-------|-------|---------------|--------------|
| 💎 **Platinum** | 85+ | 100% | All Gold + precise GPS/time match |
| 🥇 **Gold** | 70-84 | 100% | Photo with EXIF + AI match + session match |
| 🥈 **Silver** | 50-69 | 100% | Photo with EXIF GPS or timestamp match |
| 🥉 **Bronze** | 30-49 | 50% | Has photo OR logged during session |
| ❌ **Unverified** | 0-29 | 0% | Insufficient verification signals |
| 🚫 **Rejected** | N/A | 0% | Manually rejected by admin |

## Scoring Signals

### Positive Signals

| Signal | Points | Description |
|--------|--------|-------------|
| Has photo | +15 | Catch has a photo attached |
| EXIF GPS present | +20 | Photo contains GPS coordinates |
| GPS within 100m | +25 | Photo GPS matches catch location (100m) |
| GPS within 500m | +15 | Photo GPS matches catch location (500m) |
| EXIF timestamp | +15 | Photo contains timestamp |
| Time within 15 min | +15 | Photo time matches caught_at (15 min) |
| Time within 1 hour | +10 | Photo time matches caught_at (1 hour) |
| In active session | +10 | Catch logged during active session timeframe |
| Near session | +10 | Catch location within 1km of session |
| AI species match | +10 | Fish Identifier confirmed species |
| Camera info | +5 | Has camera make/model (not screenshot) |
| Weather data | +5 | Weather data present and valid |

### Penalties

| Signal | Points | Description |
|--------|--------|-------------|
| GPS too far | -20 | Photo GPS > 5km from catch location |
| Time too far | -15 | Photo timestamp > 24 hours from caught_at |
| Duplicate photo | -30 | Same photo used by another user |

## Special Rules

### Backlog Catches
- Catches with `is_backlog = true` are automatically **unverified**
- No XP or badges awarded
- Useful for logging historical catches for records only

### Competition Catches
- Must be approved by competition host
- Host can approve/reject individual catches
- Rejection requires a reason
- Only approved catches count towards leaderboard

### Grace Period
- New catches start as **pending**
- Users have time to add/update photos
- Verification runs when:
  - Photo is added/updated
  - Manually triggered
  - After 24-hour grace period

### Manual Override
- Admins can manually set verification level
- Requires a reason for audit trail
- Useful for edge cases or disputes

## Database Fields

```sql
-- On catches table
verification_score      INTEGER     -- 0-100 score
verification_level      TEXT        -- pending/unverified/bronze/silver/gold/platinum/rejected
verification_details    JSONB       -- Detailed breakdown of signals
ai_species_match        BOOLEAN     -- Did AI confirm species?
ai_confidence           DECIMAL     -- AI confidence 0-1
photo_hash              TEXT        -- For duplicate detection
verified_at             TIMESTAMPTZ -- When verification ran
verified_by             UUID        -- Who verified (for manual)
verification_override   TEXT        -- Reason for manual override

-- Competition-specific
competition_approved    BOOLEAN     -- Host approval
competition_approved_by UUID        -- Who approved
competition_approved_at TIMESTAMPTZ -- When approved
competition_rejection_reason TEXT   -- Why rejected
```

## SQL Functions

```sql
-- Calculate verification for a catch
SELECT calculate_catch_verification('catch-uuid');

-- Get XP multiplier for a level
SELECT get_verification_xp_multiplier('gold'); -- Returns 1.00

-- Competition host approve catch
SELECT approve_competition_catch(
  'catch-uuid',
  TRUE,           -- approved
  'host-uuid',
  NULL            -- rejection reason (NULL if approved)
);

-- Admin manual override
SELECT admin_verify_catch(
  'catch-uuid',
  'admin-uuid',
  'gold',
  'Verified via video evidence'
);
```

## Frontend Integration

### Run Verification
```typescript
const { data } = await supabase.rpc('calculate_catch_verification', {
  p_catch_id: catchId
})
// Returns: { score: 75, level: 'gold', details: {...} }
```

### Display Verification Badge
```tsx
function VerificationBadge({ level }: { level: string }) {
  const badges = {
    platinum: { icon: '💎', label: 'Platinum', color: 'text-cyan-400' },
    gold: { icon: '🥇', label: 'Gold', color: 'text-yellow-400' },
    silver: { icon: '🥈', label: 'Silver', color: 'text-gray-300' },
    bronze: { icon: '🥉', label: 'Bronze', color: 'text-orange-400' },
    unverified: { icon: '❌', label: 'Unverified', color: 'text-red-400' },
    pending: { icon: '⏳', label: 'Pending', color: 'text-muted-foreground' },
  }
  // ...
}
```

## User-Facing Explanation

Show users how to get verified:

> **How to verify your catches:**
> 
> 📸 **Take a photo** - Use your camera, not a screenshot
> 📍 **Keep GPS on** - Photo location is checked against your catch
> ⏱️ **Log during session** - Catches during active sessions score higher
> 🐟 **Use Fish Identifier** - AI species confirmation adds points
> 
> **Verification levels:**
> - 💎 Platinum (85+): Competition-grade, all signals match
> - 🥇 Gold (70+): Highly trusted, eligible for badges
> - 🥈 Silver (50+): Verified, full XP awarded
> - 🥉 Bronze (30+): Basic verification, 50% XP
> - ❌ Unverified (0-29): No XP awarded

## XP Integration

The XP system (`useCatchXP.ts`) should integrate verification as follows:

```typescript
// In useCatchXP mutation:

// 1. Run verification first
const { data: verification } = await supabase.rpc('calculate_catch_verification', {
  p_catch_id: input.catchId,
})

const level = verification?.level || 'pending'
const multiplier = getXPMultiplier(level) // 0, 0.5, or 1.0

// 2. If unverified, skip XP and challenges entirely
if (multiplier === 0) {
  return {
    xpAwarded: 0,
    breakdown: { ... },
    verificationLevel: level,
    verificationScore: verification?.score || 0,
  }
}

// 3. Apply multiplier to final XP
breakdown.total = Math.floor(breakdown.total * multiplier)

// 4. Only check badge-eligible challenges if Gold+
if (level === 'gold' || level === 'platinum') {
  await checkChallenges(userId, input, completed)
}
```

## Policy Summary

| Scenario | XP | Badges | Competitions |
|----------|------|--------|--------------|
| Platinum verified | 100% | ✅ | ✅ Eligible |
| Gold verified | 100% | ✅ | ❌ Needs Platinum |
| Silver verified | 100% | ❌ | ❌ |
| Bronze verified | 50% | ❌ | ❌ |
| Unverified | 0% | ❌ | ❌ |
| Backlog catch | 0% | ❌ | ❌ |
| Competition catch | Pending host approval | Pending | ✅ If approved |

## Testing Checklist

- [ ] New catch starts as 'pending'
- [ ] Verification runs on photo upload
- [ ] Score calculates correctly for each signal
- [ ] Backlog catches are auto-unverified
- [ ] Competition catches require host approval
- [ ] Admin can override verification level
- [ ] XP is multiplied by verification level
- [ ] Duplicate photo detection works
- [ ] UI shows correct verification badge
- [ ] Only Gold+ catches unlock badges
- [ ] Bronze catches get 50% XP
- [ ] Unverified catches get 0 XP
