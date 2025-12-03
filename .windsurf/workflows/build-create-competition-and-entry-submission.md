---
description: Build Create Competition & Entry Submission (Phase 2D Week 3)
---
CREATE WORKFLOW: "Build Create Competition & Entry Submission (Phase 2D Week 3)"

I want to save this as a workflow that builds the complete create competition flow (multi-step form) and the entry submission system (session picker, score calculation, leaderboard updates).

═══════════════════════════════════════════════════════════════

WORKFLOW NAME: Build Create Competition & Entry Submission

DESCRIPTION:
Creates the full competition creation wizard (4 steps), session picker modal for entering competitions, entry submission with automatic scoring, and integration with session detail pages to show "Enter Competition" buttons.

═══════════════════════════════════════════════════════════════

FEATURE REQUIREMENTS

CREATE COMPETITION FLOW:
- Access: CompetePage → [+ Create Competition] button at top
- Multi-step wizard (4 steps)
- Step 1: Competition Type (choose from 4 types)
- Step 2: Basic Info (title, description, dates, prize)
- Step 3: Rules (species, water type, location)
- Step 4: Privacy (public/private/friends)
- Progress indicator
- Back/Next navigation
- Validation at each step
- Creates competition in database
- Navigates to competition detail page

ENTRY SUBMISSION FLOW:
- From CompetitionDetailPage: Click "Enter Your Session"
- Opens SessionPickerModal
- Shows user's sessions that match competition criteria (initially: time + water type)
- Select session → submit entry via RPC scoring
- Leaderboard refreshes.

SESSION DETAIL INTEGRATION:
- Add "Enter Competition" button to SessionDetailPage
- Shows active competitions a session can enter
- CompetitionPickerModal to pick which competition to enter
- Entry submitted via shared hook.

═══════════════════════════════════════════════════════════════

WORKFLOW TASKS

Task 1: Add Create Button to CompetePage
File: src/pages/CompetePage.tsx

- Add a header row with title + "+ Create Competition" button.
- The button navigates to /compete/create.
- Reuse existing styling (no new icon libraries required; if icons are used, prefer already-installed ones).

Task 2: Create CreateCompetitionPage
File: src/pages/CreateCompetitionPage.tsx

Responsibilities:
- Implement 4-step wizard:
  1) Type selection
  2) Basic info
  3) Rules
  4) Privacy
- Manage local form state and current step.
- Validate minimal fields at each step:
  - Step 1: type required.
  - Step 2: title required; start/end set and end > start.
  - Steps 3–4: optional fields allowed.
- On final submit, call useCreateCompetition with mapped payload and navigate to /compete/:id.

Task 3: Create CompetitionTypeStep Component
File: src/components/compete/create/CompetitionTypeStep.tsx

Responsibilities:
- Render selectable cards for the 4 competition types.
- Highlight selected card; send value back via onSelect.

Task 4: Create BasicInfoStep Component
File: src/components/compete/create/BasicInfoStep.tsx

Responsibilities:
- Inputs for title, description, start/end datetime, prize.
- Length counters for title/description.
- Use native datetime-local inputs for now.

Task 5: Create RulesStep Component
File: src/components/compete/create/RulesStep.tsx

Responsibilities:
- Simple controls for:
  - allowed_species (chips from a small default list; empty = all species)
  - water_type (saltwater/freshwater/any)
  - entry_fee (number)
  - max_participants (optional number)
- Location restriction can be left as null initially for simplicity.

Task 6: Create PrivacyStep Component
File: src/components/compete/create/PrivacyStep.tsx

Responsibilities:
- 3 options: public, private (invite only), friends-only.
- Map to is_public and invite_only flags.

Task 7: Create SessionPickerModal Component
File: src/components/compete/SessionPickerModal.tsx

Responsibilities:
- Modal UI listing current user sessions for a given competition, filtered roughly by:
  - owned by user
  - started within competition start/end
  - water type matches or competition water_type is 'any'.
- Allow selecting one session and submitting via useSubmitEntry.
- Close on success; parent is responsible for refreshing leaderboard.

Task 8: Update EnterSessionButton to Use SessionPickerModal
File: src/components/compete/EnterSessionButton.tsx

Responsibilities:
- Use useCompetition(competitionId) to fetch competition.
- Show a button that opens SessionPickerModal with that competition.

Task 9: Add Route for Create Competition
File: src/App.tsx

- Add /compete/create route pointing to CreateCompetitionPage within the ProtectedRoute block.

Task 10: Ensure compete/create Components Directory Exists
Directory:
- src/components/compete/create/

Place:
- CompetitionTypeStep.tsx
- BasicInfoStep.tsx
- RulesStep.tsx
- PrivacyStep.tsx

Task 11: (Optional, later) Add "Enter Competition" to SessionDetailPage
File: src/pages/SessionDetailPage.tsx

- When running this task, integrate active competitions and a simple CompetitionPickerModal, reusing useSubmitEntry.

Task 12: (Optional, later) Create CompetitionPickerModal Component
File: src/components/compete/CompetitionPickerModal.tsx

- Modal listing eligible competitions for a session.
- Similar selection + submit pattern to SessionPickerModal.

Task 13: Test Create Competition Flow
- Manually:
  1. Go to /compete
  2. Click "+ Create Competition"
  3. Go through 4 steps with valid data
  4. Submit
  5. Verify row appears in competitions table
  6. Detail page loads and shows correct info.

Task 14: Test Entry Submission Flow from Competition Detail
- Manually:
  1. Open a competition detail page
  2. Click "Enter Your Session"
  3. Choose a session
  4. Submit
  5. Check competition_entries row appears with score and rank
  6. Leaderboard reflects new entry.

Task 15: (If implemented) Test Session Detail Integration
- Manually:
  1. Go to a session detail page
  2. Use "Enter Competition" button
  3. Submit entry
  4. Verify DB row and leaderboard.

Task 16: Basic Validation & Error Handling
- Ensure duplicate entries are prevented at the DB level (unique constraint already exists) and surfaced as a friendly error.
- Ensure entries cannot be submitted for ended competitions (guard in UI and/or DB function).

Task 17: Final Verification
- No TS errors.
- Navigation between CompetePage, CreateCompetitionPage, and CompetitionDetailPage works.
- SessionPickerModal works on both mobile and desktop widths.

═══════════════════════════════════════════════════════════════

WORKFLOW SUCCESS CRITERIA

- 4-step create competition wizard is wired and can successfully create a competition row.
- SessionPickerModal exists and can submit an entry for a competition.
- Leaderboard updates after a new entry via existing SQL functions.
- Optional session detail integration works if implemented.
- No TypeScript or runtime errors introduced by this flow.

PHASE 2D COMPLETE when this workflow and the earlier browsing/detail workflows are implemented and tested.
