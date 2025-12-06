---
description: Add tide data to Explore map using NOAA and WorldTides APIs
---

# Add Tide Data to Explore Map

Integrates NOAA and WorldTides APIs to display tide predictions when users browse locations on the Explore map. Shows current tide status, next high/low tides, and tide predictions. Automatically detects nearest tide station and caches results for performance.

## Prerequisites

1. Sign up for WorldTides API key at https://www.worldtides.info/developer (free tier: 1,000 requests/month)
2. Add to `.env.local`:
   ```env
   VITE_WORLDTIDES_API_KEY=your_api_key_here
   ```

## API Strategy

- **NOAA** (free, no key): US coastal waters only
- **WorldTides** (free tier): Global coverage
- Try NOAA first for US locations, fallback to WorldTides

## Implementation Tasks

### Phase 1: Backend Setup

1. Create tide data types in `src/types/tides.ts`
2. Create NOAA API service in `src/services/noaa-tides.ts`
3. Create WorldTides API service in `src/services/worldtides.ts`
4. Create unified tide service with smart fallback in `src/services/tides.ts`

### Phase 2: Frontend Hooks

5. Create `useTideData` hook in `src/hooks/useTideData.ts`

### Phase 3: UI Components

6. Create `TideInfoCard` component in `src/components/explore/TideInfoCard.tsx`
7. Create `TideButton` component in `src/components/explore/TideButton.tsx`

### Phase 4: Integration

8. Add TideButton to ExplorePage with map center coordinates

### Phase 5: Testing

9. Test NOAA API with US coastal location (Boston, San Francisco)
10. Test WorldTides API with international location (Sydney, London)
11. Test graceful handling for inland locations (Denver)
12. Verify caching works (30-minute stale time)
13. Test mobile responsiveness

## Success Criteria

- [ ] WorldTides API key configured
- [ ] NOAA service implemented
- [ ] WorldTides service implemented
- [ ] Smart fallback (NOAA → WorldTides)
- [ ] Tide data hook created
- [ ] Tide info card displays correctly
- [ ] Tide button on Explore map
- [ ] Current tide status shown
- [ ] Next high/low tides shown
- [ ] 48h predictions shown
- [ ] Caching works (30min stale time)
- [ ] Mobile responsive
- [ ] Error handling graceful
