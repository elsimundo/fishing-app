---
description: Build Lake Listings with tiered info display and My Lakes (pinned) feature
---

# Lake Listings & My Lakes Feature

## Overview
Redesign lake listings in Explore to show tiered information based on claim/verification status, and add "My Lakes" (pin/save) functionality.

## Data Tiers

### Unclaimed Lakes (from OSM/imported)
- Name, location, distance
- Water type icon (if known)
- "Claim this venue" CTA
- Heart button to pin to My Lakes

### Claimed/Verified Lakes
All of above, plus:
- ✅ Verified badge
- Contact info (phone, website, email)
- Facilities list (toilets, parking, disabled access, etc.)
- Rules snippet
- Photos (up to 5)
- "X sessions logged" (social proof from app data)
- Owner can edit listing

### Premium Lakes (paid subscription)
All of above, plus:
- ⭐ Premium/Featured badge
- Featured placement (top of list, highlighted marker)
- Full pricing table (day ticket, night, season)
- Opening hours
- Booking link/integration
- Special offers banner
- Analytics in owner dashboard

---

## Implementation Steps

### 1. Database: My Lakes (saved_lakes table)
// turbo
```sql
-- Create saved_lakes table for "My Lakes" feature
CREATE TABLE IF NOT EXISTS saved_lakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lake_id uuid NOT NULL REFERENCES lakes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lake_id)
);

CREATE INDEX idx_saved_lakes_user ON saved_lakes(user_id);
CREATE INDEX idx_saved_lakes_lake ON saved_lakes(lake_id);

ALTER TABLE saved_lakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved lakes"
  ON saved_lakes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save lakes"
  ON saved_lakes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave lakes"
  ON saved_lakes FOR DELETE USING (auth.uid() = user_id);
```

### 2. Database: Add lake fields for verified/premium info
// turbo
```sql
-- Add fields for verified and premium lake info
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS opening_hours text;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS facilities jsonb DEFAULT '[]';
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS rules text;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]';
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS day_ticket_price numeric(10,2);
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS night_ticket_price numeric(10,2);
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS season_ticket_price numeric(10,2);
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS booking_url text;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS special_offers text;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS session_count integer DEFAULT 0;
```

### 3. Hook: useSavedLakes
Create hook at `src/hooks/useSavedLakes.ts`:
- `useSavedLakes()` - fetch user's saved lakes
- `useSaveLake()` - mutation to save a lake
- `useUnsaveLake()` - mutation to unsave a lake
- `useIsLakeSaved(lakeId)` - check if specific lake is saved

### 4. Component: LakeCard redesign
Update `src/components/explore/NearbyLakesCard.tsx` or create new component:
- Show tiered info based on `is_verified` and `is_premium`
- Heart button with filled/outline state for saved
- Verified badge for claimed lakes
- Premium badge/styling for premium lakes
- Session count for verified lakes

### 5. Component: LakeDetailPanel
Create/update lake detail panel shown when clicking lake on map:
- Full info display based on tier
- Pin to My Lakes button
- Contact buttons (call, website, directions)
- Facilities icons
- Rules section
- Photos carousel (if premium)

### 6. My Lakes Section
Add "My Lakes" card to Explore page:
- List of pinned lakes
- Quick access links
- Empty state with CTA to explore

### 7. Admin Panel: Lake Management
Update `src/pages/admin/LakesPage.tsx`:
- View all lakes with claim status
- Approve/reject claims
- Toggle premium status
- Set premium expiry date
- Edit lake details (for verified lakes)
- View session count per lake

### 8. Lake Owner Dashboard
Ensure `src/pages/LakeOwnerDashboard.tsx` has:
- Edit all lake fields
- Upload photos
- Set pricing
- View analytics (if premium)
- Upgrade to premium CTA

---

## Files to Create/Modify

### New Files:
- `src/hooks/useSavedLakes.ts`
- `src/components/explore/MyLakesCard.tsx`
- `src/components/explore/LakeDetailPanel.tsx`
- `supabase/migrations/YYYYMMDD_saved_lakes_and_lake_fields.sql`

### Modify:
- `src/components/explore/NearbyLakesCard.tsx` - redesign lake cards
- `src/pages/ExplorePage.tsx` - add My Lakes section, lake detail panel
- `src/pages/admin/LakesPage.tsx` - premium management
- `src/pages/LakeOwnerDashboard.tsx` - edit all fields

---

## Testing Checklist
- [ ] Can save/unsave lakes
- [ ] Saved lakes persist across sessions
- [ ] Saved lakes appear in My Lakes section
- [ ] Unclaimed lakes show minimal info + claim CTA
- [ ] Verified lakes show contact + facilities + session count
- [ ] Premium lakes show full info + featured styling
- [ ] Admin can toggle premium status
- [ ] Lake owner can edit all fields
- [ ] Premium badge appears on map marker
