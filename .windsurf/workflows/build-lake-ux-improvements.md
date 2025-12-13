---
description: Build Lake UX Improvements (Detail Page, Saved Lakes, Owner Integration)
---

# Lake UX Improvements Workflow

Build a comprehensive lake experience for both anglers and lake owners.

## Phase 1: Lake Detail Page

### Step 1: Create Lake Detail Page (`/lakes/:id`)
- [ ] Create `src/pages/LakeDetailPage.tsx`
- [ ] Fetch lake data with owner and team info
- [ ] Display:
  - Lake name, region, water type
  - Cover image (if available)
  - Facilities icons (parking, toilets, cafe, tackle shop, night fishing, disabled access)
  - Pricing (day ticket, night ticket, season ticket)
  - Rules (barbless only, catch & release, max rods)
  - Contact info (phone, email, website)
  - Map preview with location
  - Owner/team section with verified badge
  - Recent activity stats (sessions, catches - from lake stats)
- [ ] Add route in `App.tsx`: `/lakes/:lakeId` → `LakeDetailPage`

### Step 2: Add CTAs to Lake Detail Page
- [ ] "Get Directions" button → opens Google Maps
- [ ] "Call" button (if phone available)
- [ ] "Visit Website" button (if website available)
- [ ] "Start Session Here" button → navigates to new session with lake pre-selected
- [ ] "Save Lake" heart button (for favorites)
- [ ] If user is owner/team: "Manage Dashboard" button

## Phase 2: Saved/Favorite Lakes

### Step 3: Create saved_lakes table
- [ ] Create migration `20251213110000_add_saved_lakes.sql`:
  ```sql
  CREATE TABLE saved_lakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lake_id UUID NOT NULL REFERENCES lakes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, lake_id)
  );
  ```
- [ ] Add RLS policies (users can manage their own saved lakes)
- [ ] Add indexes

### Step 4: Create useSavedLakes hook
- [ ] `useSavedLakes()` - fetch user's saved lakes
- [ ] `useSaveLake()` - mutation to save a lake
- [ ] `useUnsaveLake()` - mutation to remove saved lake
- [ ] `useIsLakeSaved(lakeId)` - check if specific lake is saved

### Step 5: Add Save button to Lake Detail Page
- [ ] Heart icon button (filled if saved, outline if not)
- [ ] Toggle save/unsave on click
- [ ] Show toast on save/unsave

### Step 6: Show saved lakes in Explore
- [ ] Add "Saved Lakes" section at top of lakes list in Explore
- [ ] Or add a filter/tab for "My Lakes" vs "Nearby"
- [ ] Saved lakes get a heart badge on their markers

## Phase 3: Explore Integration

### Step 7: Update Explore map lake markers
- [ ] Clicking a lake marker → navigate to `/lakes/:id` (or open bottom sheet with preview + "View Details")
- [ ] Show owner verified badge on markers for claimed lakes
- [ ] Differentiate premium lakes visually (gold border or star)

### Step 8: Lake card in Explore sidebar
- [ ] If showing lakes list, each card should:
  - Show lake name, region, water type
  - Show "Verified" badge if claimed
  - Show "Premium" badge if premium
  - Show save/heart button
  - Click → navigate to lake detail page

## Phase 4: Start Session Integration

### Step 9: Pre-fill lake when starting session
- [ ] "Start Session Here" on lake page → `/sessions/new?lakeId=xxx`
- [ ] Session creation form reads `lakeId` from URL params
- [ ] Auto-selects the lake and pre-fills location

## Success Criteria

- [ ] Users can view full lake details from Explore
- [ ] Users can save/favorite lakes
- [ ] Saved lakes appear prominently in Explore
- [ ] Lake owners see "Manage Dashboard" link on their lakes
- [ ] Users can start a session directly from a lake page
- [ ] Lake pages show owner/team with verified badges
