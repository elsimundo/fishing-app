---
description: Build Explore Map Foundation (Phase 3A Week 1)
---
CREATE WORKFLOW: "Build Explore Map Foundation (Phase 3A Week 1)"

I want to save this as a workflow that integrates Mapbox GL JS, creates the interactive map interface, displays catch markers, and implements drop-pin search with a bottom-sheet results panel.

═══════════════════════════════════════════════════════════════

WORKFLOW NAME: Build Explore Map Foundation

DESCRIPTION:
Integrates Mapbox GL JS for interactive maps, displays catches as markers, implements a center crosshair + radius-based "Search This Area" behaviour backed by a PostGIS radius query, and shows results in a mobile-friendly bottom sheet.

═══════════════════════════════════════════════════════════════

FEATURE REQUIREMENTS

EXPLORE MAP PAGE (/explore):
- Full-screen interactive Mapbox map.
- User location detection (Mapbox Geolocate control).
- Public catches visualised as markers (based on session lat/lng).
- Basic navigation controls (zoom, rotate).
- Crosshair overlay at map center.

DROP-PIN / RADIUS SEARCH:
- UI to choose radius (1, 5, 10, 25, 50 km).
- "Search This Area" button that uses the current map center.
- Server-side radius search using PostGIS (search_catches_within_radius RPC).
- Results rendered in a bottom sheet which can expand/collapse.

BOTTOM SHEET RESULTS:
- Displays list of catches within radius.
- Shows species, weight, approximate distance from center.
- Clicking an item navigates to the corresponding session detail page.
- Friendly empty and loading states.

═══════════════════════════════════════════════════════════════

WORKFLOW TASKS

Task 1: Install Mapbox Dependencies (manual step)
- Install Mapbox GL JS and its types in the project (when running this workflow for real):
  - mapbox-gl
  - @types/mapbox-gl (Dev dependency)
- Ensure the Vite/Supabase environment supports ESM for mapbox-gl.

Task 2: Document Mapbox Token Setup
- Instruct user to:
  - Create a Mapbox account and token at https://account.mapbox.com/.
  - Add token to .env.local as VITE_MAPBOX_TOKEN.
- Make sure the map component reads from import.meta.env.VITE_MAPBOX_TOKEN and fails gracefully if missing.

Task 3: Create MapboxMap Component
File: src/components/map/MapboxMap.tsx

Responsibilities:
- Initialise a Mapbox map with:
  - Outdoors style (mapbox://styles/mapbox/outdoors-v12) or similar.
  - Provided initial center/zoom.
- Add navigation and geolocate controls.
- Expose an onMapLoad(map) callback to parent components.
- Render basic circular markers for provided marker data (id, lng, lat, species?, weight?).
- Clean up map on unmount.

Task 4: Implement ExplorePage Using MapboxMap
File: src/pages/ExplorePage.tsx

Responsibilities:
- Use MapboxMap for the main viewport.
- Fetch public catches via Supabase (sessions with lat/lng and is_public = true) and map them to marker props.
- Maintain:
  - map instance state (from onMapLoad).
  - search radius (km).
  - search center (lng/lat) derived from current map center when the user taps "Search This Area".
  - show/hide state for the bottom-sheet results.
- Render a static crosshair at the center of the viewport.
- Wire SearchControls and SearchResults components.

Task 5: Create SearchControls Component
File: src/components/map/SearchControls.tsx

Responsibilities:
- Provide radius buttons (1, 5, 10, 25, 50 km).
- Provide a single CTA button "Search This Area" that invokes onSearch.
- Style as a card floating above the map near top/center.

Task 6: Create SearchResults Component
File: src/components/map/SearchResults.tsx

Responsibilities:
- Bottom sheet UI that:
  - Shows a handle to drag/expand/collapse (even if implemented as a simple expand/collapse button initially).
  - Lists results from a radius query RPC.
- Behaviour:
  - Uses React Query to call search_catches_within_radius(search_lng, search_lat, radius_km).
  - Shows loading, empty, and results states.
  - On click of a result, navigates to the corresponding session detail route.

Task 7: Create PostGIS Search Function in Supabase
SQL to be applied via Supabase SQL editor:
- Enable PostGIS extension if not present:
  - create extension if not exists postgis;
- Create search_catches_within_radius(search_lng, search_lat, radius_km) function that:
  - Joins catches to sessions.
  - Filters for public sessions with non-null coordinates.
  - Uses ST_DWithin + geography to filter within radius_km.
  - Returns id, species, weight_kg, session_id, distance_km.

Task 8: Ensure /explore Route Uses ExplorePage
File: src/App.tsx

Responsibilities:
- Confirm /explore is routed to the new ExplorePage component.
- Remove any earlier placeholder Explore view.

Task 9: Create Map Components Directory
Directory:
- src/components/map/

Place:
- MapboxMap.tsx
- SearchControls.tsx
- SearchResults.tsx

Task 10: Add Mapbox CSS / Styling
File: src/index.css (or global stylesheet)

Responsibilities:
- Import Mapbox base CSS.
- Add small custom tweaks for Mapbox controls and custom markers (rounded controls, subtle shadows, marker hover scaling).

Task 11: Test Map Display (Manual QA)
Checklist:
- Navigate to /explore.
- Map tiles load and show the expected style.
- Pan and zoom are responsive.
- Mapbox controls appear and function.
- Geolocate button prompts for permission and recenters the map when allowed.

Task 12: Test Marker Rendering
Checklist:
- Public catches with valid coords appear as markers.
- Markers are visible and click/tap friendly.
- (For Week 1, no clustering or popups required yet.)

Task 13: Test Drop-Pin Search Flow
Checklist:
- Crosshair remains fixed at center while you pan.
- Changing radius updates selected radius state.
- Tapping "Search This Area":
  - Captures current map center.
  - Opens the bottom sheet.
  - Triggers the radius RPC.
- Results show catches ordered by distance.
- Tapping a result navigates to the corresponding session page.

Task 14: Test User Location Behaviour
Checklist:
- Geolocation prompt appears on first use.
- Blue-dot (Mapbox default user dot) shows when permission granted.
- "Center on Me" via geolocate control recenters on user.
- App degrades gracefully if permission denied.

Task 15: Add Loading & Error States
- Map:
  - At least a simple fallback message if VITE_MAPBOX_TOKEN is missing or invalid.
- Results:
  - Spinner while RPC query is loading.
  - Friendly message on error (e.g. "Couldn’t load results, please try again.")

Task 16: Mobile Responsiveness QA
Checklist:
- Map fills the viewport on small screens.
- Controls and bottom sheet are touch-friendly.
- No horizontal scrolling.
- Bottom sheet expand/collapse feels natural.

Task 17: Final Verification
- No TypeScript errors from new map components.
- No runtime errors in console when using /explore.
- Core UX is usable on both desktop and mobile.

═══════════════════════════════════════════════════════════════

WORKFLOW SUCCESS CRITERIA

- Mapbox GL JS is cleanly integrated using a reusable MapboxMap component.
- /explore shows a fully interactive map.
- Public catches appear as markers based on session coordinates.
- User location can be requested and centered.
- Radius-based "Search This Area" flow works end-to-end (UI → RPC → results list → navigation).
- No critical TypeScript or runtime errors are introduced.

When all of the above hold and basic QA passes, **Build Explore Map Foundation (Phase 3A Week 1)** is considered complete and the app is ready for Week 2 tasks (clustering, species icons, environmental widgets).
