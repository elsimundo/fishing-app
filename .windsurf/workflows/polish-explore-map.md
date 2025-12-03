---
description: Polish Explore Map (Pragmatic Implementation)
---
CREATE WORKFLOW: "Polish Explore Map (Pragmatic Implementation)"

I want to save this as a workflow that polishes the existing Explore map implementation by adding distance information, sort functionality, and improving the "Search this area" experience. This keeps the working bounds-based approach and adds high-value features.

═══════════════════════════════════════════════════════════════

WORKFLOW NAME: Polish Explore Map

DESCRIPTION:
Enhances the existing Explore map by adding distance calculations from user location, sort options in list view, improved "Search this area" pill with count, and an optional bottom sheet for dense marker areas. Keeps the current bounds-based search approach and existing UX (filters, map/list toggle) instead of rebuilding from scratch.

═══════════════════════════════════════════════════════════════

CONTEXT: CURRENT IMPLEMENTATION

The app already has:
- ExplorePage with Map + List view toggle
- Bounds-based search ("Search this area" pill when map moves)
- Filter chips for Sessions, Catches, Shops, Clubs, Charters
- Marker detail cards at bottom of map
- User location with "Use my location" button
- Smart bounds tracking (liveBounds vs appliedBounds)

Goal: **POLISH** this implementation, not replace it.

═══════════════════════════════════════════════════════════════

IMPROVEMENT GOALS

1. **Add distance info**
   - Show distance from user location on marker cards.
   - Show distance in list view items.
   - Use a small Haversine utility with a formatter.

2. **Add sort options**
   - Sort by: Distance, Date, Weight (for catches).
   - Works in list view; respects current filters.
   - Distance sort disabled if no user location.

3. **Polish "Search this area" pill**
   - Show count in the pill: e.g. "Search this area (47)".
   - Animate when bounds change.
   - Give clearer feedback about what will be updated.

4. **Optional: dense area bottom sheet**
   - When many markers are visible, offer "View as list".
   - Slide-up sheet with scrollable list.
   - Reuses marker data and distance info.

═══════════════════════════════════════════════════════════════

WORKFLOW TASKS

Task 1: Verify Current Implementation

File: src/pages/ExplorePage.tsx

Confirm it already provides:
- Map view using Mapbox (via ExploreMap component).
- List view toggle.
- Filter chips for marker types.
- `markers` array with `type`, `lat`, `lng`, `title` (and possibly more fields).
- `liveBounds` and `appliedBounds` state.
- "Search this area" pill that appears when bounds change.
- `userLocation` and "Use my location" button.

Report: **"Current implementation verified ✓"** or list any deviations.

Task 2: Create Distance Calculation Utility

File: src/utils/distance.ts

Add a small, framework-agnostic utility exposing:
- `calculateDistance(lat1, lng1, lat2, lng2): number` (Haversine, returns km).
- `formatDistance(km): string` (e.g. "2.5km" or "850m").

Task 3: Extend ExploreMarker With Distance Metadata

Depending on where `ExploreMarker` is defined (e.g. src/components/map/ExploreMap.tsx or a shared types file):
- Add an optional `distance?: number` field (km from user, if known).
- Optionally allow marker-type-specific metadata (weight, timestamp) needed for sorting.

Task 4: Compute Distances in ExplorePage

File: src/pages/ExplorePage.tsx

- Import `calculateDistance`.
- When building the `markers` array, derive `markersWithDistance` by:
  - If `userLocation` is known, compute `distance` for each marker.
  - Otherwise leave `distance` undefined.
- Use `markersWithDistance` downstream (map view + list view) instead of the raw `markers` array.

Task 5: Show Distance in Marker Detail Card

File: wherever the marker detail card is rendered inside ExplorePage (map view overlay).

- Import `formatDistance`.
- If `selectedMarker.distance` is defined, render a small distance row:
  - Example: `📍 2.5km away` using `formatDistance(selectedMarker.distance)`.

Task 6: Add Sort State and Logic for List View

File: src/pages/ExplorePage.tsx

- Introduce a `SortOption` union type, e.g. `'distance' | 'date' | 'weight'`.
- Add `const [sortBy, setSortBy] = useState<SortOption>('distance')`.
- Derive `sortedMarkers` from `markersWithDistance` by applying a `.sort(...)` according to `sortBy`:
  - **distance**: ascending by `distance`, placing items without `distance` last.
  - **date**: descending by a timestamp field (e.g. session start, catch time) if available.
  - **weight**: for catches only, descending by `weight_kg`; others can remain grouped or unsorted.

Task 7: Create SortSelector Component

File: src/components/explore/SortSelector.tsx

- Props:
  - `value: SortOption`.
  - `onChange(value: SortOption)`.
  - `hasUserLocation: boolean` (to disable distance sort if unknown).
- Render compact pill buttons (Distance / Recent / Weight) with simple icons/emojis.
- Disable or visually grey-out Distance option when `hasUserLocation` is false.

Task 8: Integrate SortSelector in List View

File: src/pages/ExplorePage.tsx

- In the list view section, above the items list, render `SortSelector`.
- Pass `sortBy`, `setSortBy`, and `!!userLocation` to it.
- Use `sortedMarkers` instead of `markers` when rendering list items.

Task 9: Enhance "Search this area" Pill

File: src/pages/ExplorePage.tsx

- Compute `visibleMarkersCount` based on `liveBounds` and the **un-applied** markers collection.
- Update the pill label to include the count when > 0, e.g. `Search this area (23)`.
- Add a small slide/fade animation class to draw attention when it appears.
- Keep the underlying behaviour the same (copy `liveBounds` → `appliedBounds` on click).

Task 10: Optional Dense Area Sheet Component

File: src/components/explore/DenseAreaSheet.tsx

- A bottom sheet component that accepts:
  - `markers: ExploreMarker[]` (ideally already distance-enriched & sorted).
  - `onMarkerClick(marker)` callback.
  - `onClose()`.
- Render a scrollable list of markers with:
  - Icon per type.
  - Title.
  - Type label.
  - Distance string if available.
- Include expand/collapse behaviour (e.g. via CSS or framer-motion) but keep logic simple.

Task 11: Wire Dense Area Detection (Optional)

File: src/pages/ExplorePage.tsx

- Based on `visibleMarkersCount` (and maybe type filters), determine if the area is "dense" (e.g. > 20 markers).
- If dense and in map view, show a small floating button: `View 23 as list`.
- Clicking the button opens `DenseAreaSheet` populated with the **sorted** visible markers.
- When a marker is tapped in the sheet, call `onMarkerClick` (same logic as map markers) and close the sheet.

Task 12: Test Distance Display

Manual checklist:
- Allow location.
- Ensure distances appear in marker detail cards.
- Check formatting in km vs m for nearby spots.
- Confirm markers without valid coords do not break UI.

Task 13: Test Sort Behaviour

Manual checklist:
- Switch to list view.
- Toggle between Distance / Recent / Weight.
- Verify ordering matches expectation.
- Confirm Distance is disabled or clearly inactive if location is off.

Task 14: Test Search Pill Improvements

Manual checklist:
- Pan/zoom map to change bounds.
- Inspect that the pill appears with updated counts.
- Click the pill and verify markers/list update accordingly.
- Confirm animation looks natural and not distracting.

Task 15: Test Dense Area Sheet (If Implemented)

Manual checklist:
- Move map to an area with many markers.
- Confirm "View as list" appears and sheet opens.
- Confirm there are no scroll/gesture conflicts with the map.

Task 16: Mobile QA

- Verify all new UI elements (distance text, sort selector, pill, optional sheet) are readable and tap-friendly on a mobile viewport.
- Ensure no layout regressions (no horizontal scroll, map still usable).

Task 17: Final Verification

- No new TypeScript errors from distance utilities or new components.
- No runtime errors in /explore.
- Existing behaviours (filters, navigation to sessions/catches) still work.
- Performance remains smooth with typical data volume.

═══════════════════════════════════════════════════════════════

WORKFLOW SUCCESS CRITERIA

- Distances from user location are correctly calculated and displayed for markers.
- List view supports sorting by distance, recency, and (for catches) weight.
- "Search this area" pill communicates impact (via count + animation) without altering the underlying bounds logic.
- Optional dense area sheet provides a usable alternative view in crowded regions.
- All changes preserve the current Explore UX patterns (filters, map/list toggle, bounds-based search) while making them more informative and delightful.
