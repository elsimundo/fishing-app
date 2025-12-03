---
description: Build Competition Browsing & Detail (Phase 2D Week 2)
---
CREATE WORKFLOW: "Build Competition Browsing & Detail (Phase 2D Week 2)"

I want to save this as a workflow that builds the complete UI for browsing competitions, viewing competition details, seeing leaderboards, and joining competitions.

═══════════════════════════════════════════════════════════════

WORKFLOW NAME: Build Competition Browsing & Detail

DESCRIPTION:
Creates the Compete page with tabs for active/upcoming competitions, competition detail pages with leaderboards, join competition flow, and integration with existing navigation.

═══════════════════════════════════════════════════════════════

FEATURE REQUIREMENTS

COMPETE PAGE (/compete):
- Tabs: [Active] [Upcoming] [My Competitions]
- Active tab: Shows currently running competitions
- Upcoming tab: Shows competitions not yet started
- My Competitions tab: Shows competitions you created or entered
- Competition cards with key info
- Empty states for each tab
- Pull-to-refresh
- Mobile responsive

COMPETITION CARD:
- Cover image (or gradient)
- Competition type badge
- Title and description preview
- Creator info (avatar + username)
- Participant count
- Prize info (if any)
- Time remaining (for active) or start date (for upcoming)
- "Join" or "View" button
- Click card → go to detail page

COMPETITION DETAIL PAGE (/compete/:id):
- Full competition info
- Cover image/hero section
- Title, description, type
- Rules section (species, water type, location)
- Time info (starts/ends)
- Prize info
- Creator info
- Participant count
- Current user's rank (if entered)
- "Join Competition" button
- "Enter Session" button (if joined)
- Leaderboard section
- Share button

LEADERBOARD:
- Ranked list of entries
- Position, avatar, username
- Score with units (kg, count, species, votes)
- Your entry highlighted
- Top 3 get podium styling
- Session preview (click to view)
- Empty state if no entries

JOIN FLOW (INITIAL UI-ONLY VERSION):
- Click "Join Competition"
- Show confirmation/feedback via button + toast
- Button changes to "Enter Session" once join simulated

ENTER SESSION FLOW (INITIAL PLACEHOLDER):
- Click "Enter Session"
- Opens simple modal explaining that full session picker will come in Week 3

═══════════════════════════════════════════════════════════════

WORKFLOW TASKS

Task 1: Create CompetePage.tsx
File: src/pages/CompetePage.tsx

Responsibilities:
- Three tabs: Active, Upcoming, My Competitions
- Uses competition hooks: useActiveCompetitions, useUpcomingCompetitions, useMyCompetitions, useMyEnteredCompetitions
- Combines created + entered into "My Competitions"
- Loading states, empty states, pull-to-refresh

Implementation sketch (to be coded when running this workflow):
- Functional component with Tab state
- Uses PullToRefresh from react-simple-pull-to-refresh
- Renders CompetitionCard list or EmptyState per tab

Task 2: Create CompetitionCard Component
File: src/components/compete/CompetitionCard.tsx

Responsibilities:
- Visual card for a competition on /compete
- Cover image or gradient
- Type badge + status badge
- Title, description preview
- Creator avatar/username
- Participant count, time info, optional prize badge
- Clickable: navigate to /compete/:id

Task 3: Create CompetitionDetailPage
File: src/pages/CompetitionDetailPage.tsx

Responsibilities:
- Fetch single competition via useCompetition
- Fetch leaderboard via useCompetitionLeaderboard
- Fetch current user's entry via useUserEntry
- Render:
  - Back + share header
  - CompetitionHero
  - CompetitionInfo
  - Action strip (Join / Enter / status info)
  - CompetitionLeaderboard
- Handle loading and not-found states.

Task 4: Create CompetitionHero Component
File: src/components/compete/CompetitionHero.tsx

Responsibilities:
- Hero/cover section at top of detail page
- Background image or gradient
- Status badge, type badge, optional "Your rank" badge
- Big title and prize callout.

Task 5: Create CompetitionInfo Component
File: src/components/compete/CompetitionInfo.tsx

Responsibilities:
- About/description block
- Rules: allowed species, water type, location radius (if present)
- Schedule: formatted starts_at / ends_at
- Participants: participant_count
- Hosted By: creator avatar, name, username.

Task 6: Create CompetitionLeaderboard Component
File: src/components/compete/CompetitionLeaderboard.tsx

Responsibilities:
- Ranked list of CompetitionEntry items
- Podium styling for ranks 1–3
- Highlight current user entry
- Show score with units derived from competition type
- Empty and loading states.

Task 7: Create JoinCompetitionButton Component
File: src/components/compete/JoinCompetitionButton.tsx

Responsibilities (Week 2 scope):
- Show primary "Join Competition" CTA when user has not entered
- On click, simulate join + show toast
- Disable while "joining"; text changes to loading state
- Future Week 3: wire into real participation/entry model

Task 8: Create EnterSessionButton Component
File: src/components/compete/EnterSessionButton.tsx

Responsibilities (Week 2 scope):
- Show "Enter Your Session" button for users who have joined
- For now, open a simple modal explaining that full session picker will come in Week 3
- Provide a quick navigation button (e.g. to sessions/dashboard) as a temporary UX.

Task 9: Update Navigation to Point to /compete
Files:
- src/components/navigation/BottomNav.tsx
- src/components/navigation/Sidebar.tsx

Responsibilities:
- Ensure "Compete" nav item routes to /compete
- Keep styling and active state consistent with existing nav items.

Task 10: Add Compete Routes to App.tsx
File: src/App.tsx

Add routes:
- /compete → CompetePage
- /compete/:competitionId → CompetitionDetailPage

Ensure these are wrapped in the authenticated/protected routing layer like other app pages.

Task 11: Ensure compete Components Directory Exists
Create folder:
- src/components/compete/

And place:
- CompetitionCard.tsx
- CompetitionHero.tsx
- CompetitionInfo.tsx
- CompetitionLeaderboard.tsx
- JoinCompetitionButton.tsx
- EnterSessionButton.tsx

Task 12: Test Competition Browsing
Manual QA checklist:
1. Navigate to /compete.
2. Verify three tabs show and switching works.
3. See competition cards or empty states on each tab.
4. Pull to refresh reloads list.
5. Clicking a card navigates to detail page.
6. No console errors.

Task 13: Test Competition Detail Page
Manual QA checklist:
1. Navigate to /compete/:id for a real competition.
2. See hero with image/gradient + badges + prize.
3. Info section shows description, rules, schedule, host, participants.
4. Leaderboard section loads; shows entries or empty state.
5. Join button appears when you haven't entered; Enter Session (placeholder) appears when you have.
6. Share button opens native share or copies link.
7. Back button returns to previous page.
8. No console errors.

Task 14: (Optional) Add Sample Competition Data in Supabase
Example SQL to seed a visible competition for testing:
- Insert one public active competition with a prize and reasonable start/end dates.

Task 15: Polish Empty States
Ensure all empty states use friendly copy:
- Active: "No active competitions"
- Upcoming: "No upcoming competitions"
- Mine: "Join a competition or create your own!"
- Leaderboard: "No entries yet. Be the first to compete!"

Task 16: Verify Loading States
- Spinner for list loading on /compete
- Full-screen spinner for competition detail loading
- Spinner for leaderboard loading.

Task 17: Test Mobile Responsiveness
- Tabs scroll horizontally if content overflows
- Cards stack vertically and tap targets are comfortable
- Detail page scrolls; no horizontal scrollbars
- Leaderboard rows fit and text truncates nicely.

Task 18: Final Verification
Confirm Week 2 requirements met:
- Compete page works with tabs and pull-to-refresh
- Cards render key info
- Detail page shows full info and leaderboard
- Join/Enter flows show correct buttons (UI-level for now)
- Navigation and routes are wired
- Empty/loading states exist
- Mobile friendly
- No TypeScript or runtime errors.

═══════════════════════════════════════════════════════════════

WORKFLOW SUCCESS CRITERIA

- CompetePage with tabs works and uses competition hooks
- Competition cards display correctly with key metadata
- Detail page shows all important fields and related data
- Leaderboard shows ranked entries with clear scoring units
- Join/Enter buttons render in the right states (even if entry picker is a placeholder)
- Navigation integrates /compete cleanly into the app
- Pull-to-refresh and empty/loading states feel polished
- Layout works well on mobile
- No TypeScript or console errors.

WEEK 2 COMPLETE when all items above are satisfied.

Ready for Week 3: Create Competition & Entry Flow (multi-step create form + real session picker + entry submission).
