---
description: Polish Explore Map (Production-Ready)
---
CREATE WORKFLOW: "Polish Explore Map (Production-Ready)"

I want to save this as a workflow that polishes the existing Explore map implementation by adding distance information, sort functionality, enhanced search pill, and quick UX wins. This builds on the working bounds-based approach WITHOUT rebuilding.

═══════════════════════════════════════════════════════════════

WORKFLOW NAME: Polish Explore Map (Final)

DESCRIPTION:
Enhances the existing ExplorePage.tsx and ExploreMap.tsx by adding distance calculations, sort options, improved "Search this area" pill with count, and quick UX polish wins. Keeps the superior bounds-based search approach with liveBounds/appliedBounds pattern.

═══════════════════════════════════════════════════════════════

CONTEXT: CURRENT IMPLEMENTATION

The app already has:
- src/pages/ExplorePage.tsx with Map + List view toggle
- src/components/map/ExploreMap.tsx (Mapbox wrapper)
- Bounds-based search with liveBounds vs appliedBounds
- hasPendingBounds triggers "Search this area" pill
- Filter chips for Sessions, Catches, Tackle shops, Clubs, Charters
- selectedMarker shows detail card at bottom of map
- User location with "Use my location" button
- Mapbox GL JS with VITE_MAPBOX_TOKEN

This is a SOLID implementation. We're adding 2-3 hours of polish.

═══════════════════════════════════════════════════════════════

PRIORITY TASKS

Priority 1: Distance + Count in Search Pill
- Add distance calculation utility
- Show marker count in "Search this area (47)" pill
- Show distance in marker detail card

Priority 2: Sort by Distance in List View
- Add sort selector (Distance, Recent)
- Sort markers by distance from user location
- Fall back gracefully if no location

Priority 3: Quick UX Wins
- Pulsing user location marker
- Filter count badges
- "Recenter Map" button
- Hide search pill when marker selected

Skip for now:
- Dense area bottom sheet (list view already handles this)
- Sort by weight (nice-to-have, not critical)
- Marker clustering (not needed yet)

═══════════════════════════════════════════════════════════════

WORKFLOW TASKS

Task 1: Verify Current Implementation

Check that these files exist:
- src/pages/ExplorePage.tsx
- src/components/map/ExploreMap.tsx

Verify ExplorePage has:
- `view` state switching between map and list views.
- `markers` array built from sessions, catches, and static POIs.
- `liveBounds` and `appliedBounds` state.
- `hasPendingBounds` boolean.
- `selectedMarker` state.
- `userLocation` and "Use my location" button.

Verify ExploreMap has:
- Mapbox GL initialisation using VITE_MAPBOX_TOKEN.
- `onBoundsChange` callback wired to `moveend`.
- Marker rendering based on `markers` prop.

Report: **"Current implementation verified ✓"** or list missing pieces.

Task 2: Create Distance Calculation Utility

File: src/utils/distance.ts

Implement:
- `calculateDistance(lat1, lng1, lat2, lng2): number` using Haversine.
- `formatDistance(km): string` to produce friendly strings like "2.3km" or "850m".

Task 3: Add Distance to ExploreMarker Type

Where ExploreMarker is defined (currently in src/components/map/ExploreMap.tsx), extend it:

```ts
export interface ExploreMarker {
  id: string
  type: 'session' | 'catch' | 'shop' | 'club' | 'charter'
  lat: number
  lng: number
  title: string
  distance?: number // Distance from user in km
  timestamp?: string // Optional: for sorting by recency
  weight?: number // Optional: for catches
}
```

Update any imports or usages as needed (e.g. in ExplorePage.tsx).

Task 4: Add Distance Calculation in ExplorePage

File: src/pages/ExplorePage.tsx

- Import `calculateDistance` from `utils/distance`.
- After building the base `markers` array, derive `markersWithDistance` with `useMemo`:
  - If `userLocation` exists, compute `distance` for each marker.
  - Otherwise, return `markers` unchanged.
- Replace downstream uses of `markers` with `markersWithDistance`.

Task 5: Calculate Visible Marker Count for Search Pill

File: src/pages/ExplorePage.tsx

- With `useMemo`, compute `visibleMarkersCount` based on `liveBounds` and `markersWithDistance` (and any active filters).
- Use this count for display in the "Search this area" pill.

Task 6: Update "Search this area" Pill to Show Count

File: src/pages/ExplorePage.tsx

- Replace the existing pill rendering to:
  - Only show when appropriate (`hasPendingBounds`, possibly further refined).
  - Display label `Search this area`.
  - If `visibleMarkersCount > 0`, show a count chip.
  - Add a small slide/fade animation class so it feels responsive when it appears.

Task 7: Show Distance in Marker Detail Card

File: src/pages/ExplorePage.tsx

- Import `formatDistance` from `utils/distance`.
- In the `selectedMarker` detail card, conditionally render a small distance row if `selectedMarker.distance` is defined, e.g. `📍 2.3km away`.

Task 8: Add Sort State and Logic for List View

File: src/pages/ExplorePage.tsx

- Introduce `type SortOption = 'distance' | 'date'`.
- Add `const [sortBy, setSortBy] = useState<SortOption>('distance')`.
- With `useMemo`, derive `sortedMarkers` from `markersWithDistance`:
  - `distance`: sort ascending by `distance` when `userLocation` exists; otherwise fallback to `date`.
  - `date`: sort descending by `timestamp` (if available) for sessions/catches.

Task 9: Create SortSelector Component

File: src/components/explore/SortSelector.tsx

- Provide a small UI control for switching between Distance and Recent sorting.
- Props:
  - `value: SortOption`.
  - `onChange(value: SortOption)`.
  - `hasUserLocation: boolean` to disable/grey-out the Distance option if no location.

Task 10: Integrate SortSelector into List View

File: src/pages/ExplorePage.tsx

- In the list view branch (`view === 'list'`), render `SortSelector` above the items:
  - Pass `sortBy`, `setSortBy`, and `!!userLocation`.
- Use `sortedMarkers` to render list items instead of the raw `markers`.

Task 11: Add Pulsing User Location Marker

File: src/components/map/ExploreMap.tsx

- When a `center` or `userLocation` is known (and if you decide to pass it down), create a separate Mapbox marker with a pulsing CSS animation.
- Add corresponding CSS in your global stylesheet.

Task 12: Add Filter Count Badges

File: src/pages/ExplorePage.tsx

- Compute per-type counts from `markersWithDistance` with `useMemo`.
- For each active filter chip (Sessions, Catches, etc.), optionally show a small badge with the count.

Task 13: Add "Recenter Map" Button

File: src/pages/ExplorePage.tsx (and potentially ExploreMap.tsx if direct map access is needed)

- When `appliedBounds` is set (i.e. the user has searched an area), show a small floating button like `↻` to reset view.
- On click, clear `appliedBounds` and optionally recenter on `userLocation` if available.

Task 14: Hide Search Pill When Marker Selected

File: src/pages/ExplorePage.tsx

- Adjust logic so that the pill doesn’t show when a `selectedMarker` is active (to avoid overlapping calls to action).
- This can be done by deriving a `pillVisible` boolean from `hasPendingBounds` and `selectedMarker`.

Task 15: Add Distance to List View Items

File: src/pages/ExplorePage.tsx (or wherever list items are rendered)

- In the list representation of markers, show type + distance where available, using `formatDistance`.

Task 16: Testing – Distance Display

- Test that distances show correctly in both the map detail card and list view when user location is known.
- Confirm there are no crashes or NaN values when coordinates are missing.

Task 17: Testing – Sort Behaviour

- In list view, verify that:
  - Distance sort orders items nearest-first.
  - Recent sort orders items newest-first.
  - Distance sort is disabled or falls back gracefully when user location is unavailable.

Task 18: Testing – Search Pill Enhancements

- Confirm the pill shows the correct count and appears/disappears at the right times.
- Verify that clicking the pill updates applied bounds and hides the pill.

Task 19: Testing – Quick UX Wins

- Confirm pulsing location marker, filter count badges, and recenter button behave as expected.
- Check that these additions don’t obscure existing controls or cause layout issues.

Task 20: Performance & Mobile QA

- Ensure `useMemo` usage keeps re-renders and distance calculations cheap.
- Verify smooth panning/zooming with typical data volumes.
- On a mobile viewport, confirm that:
  - Sort selector is tap-friendly.
  - Search pill and recenter button are visible and not overlapping Mapbox controls.
  - No horizontal scrolling appears.

Task 21: Final Verification

- No new TypeScript errors.
- No console errors when using /explore heavily.
- Existing features (filters, navigation to sessions/catches) still behave as before.

═══════════════════════════════════════════════════════════════

WORKFLOW SUCCESS CRITERIA

- Distance from user location is correctly calculated and displayed in both map and list contexts.
- The "Search this area" pill shows a meaningful count and feels responsive.
- List view supports at least Distance and Recent sorting in a clear, discoverable way.
- User location and filter quick wins (pulsing marker, badges, recenter) enhance usability without cluttering the UI.
- Performance remains smooth and the Explore experience feels production-ready on both desktop and mobile.
