---
description: Rename Dashboard to Logbook & Finalize Hub Structure
---
CREATE WORKFLOW: "Rename Dashboard to Logbook & Finalize Structure"

I want to save this as a workflow that renames all instances of "Dashboard" to "Logbook" throughout the app, updates icons, ensures the tabbed hub structure is complete, and verifies the final navigation is consistent.

═══════════════════════════════════════════════════════════════

WORKFLOW NAME: Rename Dashboard to Logbook & Finalize Structure

DESCRIPTION:
Changes all user-facing instances of "Dashboard" to "Logbook" for authentic fishing terminology. Updates navigation icons to book/notebook theme. Ensures Logbook has proper tab structure (Sessions, Competitions, Stats) and functions as the personal hub.

═══════════════════════════════════════════════════════════════

FINAL APP STRUCTURE:

NAVIGATION (Mobile & Desktop):
1. 🏠 Feed (social discovery)
2. 🗺️ Explore (map with competition pill)
3. ➕ Post (create content)
4. 📓 Logbook (personal hub with tabs)
5. 👤 Profile (public profile)

LOGBOOK TABS:
1. 📅 Sessions (fishing trips)
2. 🏆 Competitions (created + entered)
3. 📈 Stats (analytics)

COMPETITION DISCOVERY:
- Feed posts (host announces)
- Explore map pill (geographic discovery)
- Direct invites (targeted recruitment)
- Logbook Competitions tab (manage yours)

═══════════════════════════════════════════════════════════════

WORKFLOW TASKS:

Task 1: Update Mobile Bottom Navigation
File: src/components/navigation/BottomNav.tsx

Change Dashboard to Logbook and use a book icon.

Task 2: Update Desktop Sidebar
File: src/components/navigation/Sidebar.tsx

Change Dashboard to Logbook and use a book icon.

Task 3: Update DashboardPage Header
File: src/pages/DashboardPage.tsx

Change main page heading from "Dashboard" to "Logbook".

Task 4: Update Mobile Header Page Titles (if present)
File: src/components/navigation/MobileHeader.tsx

Change any mapping of route `/dashboard` from "Dashboard" to "Logbook".

Task 5: Update Empty States Throughout App

Search for "dashboard" in user-facing copy (empty states, helper text) and update phrasing to "logbook" while keeping technical terms (routes, file names) as-is.

Task 6: Update Onboarding/Help Text (If Any)

Ensure any references to "dashboard" in onboarding/tutorial/help text are updated to "logbook".

Task 7: Verify Logbook Tab Structure
File: src/pages/DashboardPage.tsx

Confirm the page behaves as a Logbook hub with three tabs: Sessions, Competitions, Stats. If missing, implement a simple tab state and stub components.

Task 8: Create/Verify CompetitionsTab Component
File: src/components/dashboard/CompetitionsTab.tsx

Ensure there is a Competitions tab that can show entered and created competitions, or create a basic version if missing.

Task 9: Update Route Comments (Optional)
File: src/App.tsx

Clarify in comments that `/dashboard` is the user's Logbook while leaving the route path unchanged.

Task 10: Search for Remaining "Dashboard" References

Run a case-insensitive search for "dashboard" and update any user-facing labels to "logbook", leaving internal technical references untouched.

Task 11: Test Mobile Navigation

Verify bottom navigation shows "Logbook" with a book-style icon, navigates to `/dashboard`, and the Logbook page header/tabs render correctly.

Task 12: Test Desktop Navigation

Verify sidebar shows "Logbook" with a book-style icon, navigates to `/dashboard`, and the Logbook page header/tabs render correctly.

Task 13: Test Logbook Tabs

Confirm the three Logbook tabs (Sessions, Competitions, Stats) work as expected, with appropriate empty states where data is missing.

Task 14: Test Quick Actions

Verify any quick action buttons at the top of the Logbook (e.g. Start Session, Competitions) behave as expected.

Task 15: Visual Consistency Check

Ensure icons, typography, spacing, and active states for the Logbook match the rest of the app, on both mobile and desktop.

Task 16: Update README/Documentation (If Any)

Update project documentation to describe the new navigation structure, including the Logbook as the personal hub.

Task 17: Final Verification

Confirm all user-facing references now say "Logbook" instead of "Dashboard" (except URLs), navigation is consistent, and there are no TypeScript or runtime errors.
