---
description: Add Tackle Shops from OpenStreetMap to Explore Map
---

# Add Tackle Shops from OpenStreetMap

Queries OpenStreetMap via Overpass API for fishing tackle shops, bait shops, and outdoor stores within the map bounds. Displays shops as markers, populates TackleShopsCard with expandable list, and shows detail card when marker clicked. Fully integrated with existing filter system. 100% free with no API key.

## Current Explore Architecture

```
┌─────────────────────────────────────┐
│ HEADER (sticky)                     │
│ - Filter chips: [Sessions][Catches] │
│   [Shops][Clubs][Charters]          │
├─────────────────────────────────────┤
│ MAP (35vh, compact)                 │
│ - Markers for sessions/catches/shops│
│ - Selected marker card (bottom)     │
├─────────────────────────────────────┤
│ DATA CARDS (scrollable)             │
│ - TideCard                          │
│ - WeatherCard                       │
│ - TackleShopsCard ← POPULATING      │
│ - SessionsCatchesCard               │
└─────────────────────────────────────┘
```

## Overpass API

- **URL**: https://overpass-api.de/api/interpreter
- **Cost**: Free, no API key
- **Rate limit**: ~2 requests/second
- **Tags**: `shop=fishing`, `shop=outdoor`, `name~="tackle|bait|fishing"`

---

## Tasks

### Task 1: Create Tackle Shop Types
File: `src/types/shops.ts`

```typescript
export interface TackleShop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  shopType?: 'fishing' | 'outdoor' | 'sports';
  distance?: number;
  source: 'osm';
  verified?: boolean;
}

export interface TackleShopsResponse {
  shops: TackleShop[];
  fetchedAt: string;
  bounds: { north: number; south: number; east: number; west: number };
}
```

### Task 2: Create Overpass API Service
File: `src/services/overpass.ts`

- Build Overpass QL query for tackle shops
- Parse response into TackleShop objects
- Build address from OSM tags
- Export `getTackleShopsInBounds(bounds)`

### Task 3: Create Tackle Shops Hook
File: `src/hooks/useTackleShops.ts`

- React Query hook with 30min staleTime
- Calculate distances from user location
- Sort by distance

### Task 4: Add Shops to Marker Data
File: `src/pages/ExplorePage.tsx`

- Import `useTackleShops`
- Fetch shops based on `appliedBounds`
- Add shop markers to `markers` array
- Update `markerCounts` for filter chip

### Task 5: Update Selected Marker Card for Shops
File: `src/pages/ExplorePage.tsx`

- Show shop details: name, address, phone, website, hours
- "Get Directions" button → Google Maps

### Task 6: Update TackleShopsCard Component
File: `src/components/explore/TackleShopsCard.tsx`

- Accept `shops: TackleShop[]` from hook
- Show 3 by default, expandable
- Call/Website/Directions buttons
- OSM attribution footer

### Task 7: Pass Shops to TackleShopsCard
File: `src/pages/ExplorePage.tsx`

```tsx
<TackleShopsCard
  lat={mapCenter?.lat || null}
  lng={mapCenter?.lng || null}
  shops={shopsData?.shops || []}
/>
```

### Task 8: Add Shop Marker Styling
File: `src/components/map/ExploreMap.tsx`

- Cyan markers with 🎣 icon for shops

---

## Testing

### Task 9: Test Overpass API Integration
1. Navigate to Explore
2. Enable location or search area
3. Toggle "Shops" filter ON
4. Console: "Found X tackle shops in area"
5. Shops appear as cyan markers

### Task 10: Test Shop Markers
1. Click shop marker → detail card appears
2. Shows: name, distance, address, phone, website
3. "Get Directions" opens Google Maps

### Task 11: Test TackleShopsCard
1. Shows "X nearby" count
2. Lists 3 shops by default
3. Call/Website/Directions buttons work
4. "Show More" expands list

### Task 12: Test Filter Integration
1. Toggle "Shops" OFF → markers disappear
2. Toggle "Shops" ON → markers reappear
3. Filter count badge updates

### Task 13: Test Caching
1. Search area → API call
2. Pan back → loads from cache
3. 30min cache expiry

### Task 14: Test Data Quality
- UK/US urban: multiple shops
- Rural: fewer/no shops (expected)
- Names/addresses make sense

### Task 15: Final Verification
- ✅ Overpass API integrated
- ✅ Shops appear as markers
- ✅ Click marker → detail card
- ✅ TackleShopsCard populated
- ✅ Filter chip works
- ✅ Distance sorting
- ✅ 30min caching
- ✅ No API key required
- ✅ Mobile responsive

---

## Success Criteria

- OSM integration working
- Shops visible on map (cyan 🎣)
- Filter chip functional
- Detail card displays
- TackleShopsCard populated
- Distance sorting works
- Caching optimized
- 100% free solution

## Future Enhancement (Phase 2)

- "Claim Business" for shop owners
- Premium placement ($)
- User-submitted shops
- Reviews within app
- Custom fields (live bait, boat rentals)
