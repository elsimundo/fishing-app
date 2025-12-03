---
description: Align Project Architecture
---

Ensures the app architecture, navigation, and branding are aligned with the current Phase 2C design.

## Preconditions
- Project is the Fishing App (React 18, TS, Vite, Tailwind v4, Supabase).
- Current phase is 2C (profiles & social features).
- Branding must be generic ("Fishing App"), with **no** "TheSwim" references.

## Project Context
- **Navigation (mobile)**
  - Feed
  - Explore
  - Post (FAB button) – opens CreatePostModal (does **not** navigate directly)
  - Sessions
  - Profile
- **Navigation (desktop)**
  - Feed
  - Sessions
  - Explore
  - Compete
  - Profile
  - Post button – opens CreatePostModal (does **not** navigate directly)
- **Key terminology**
  - Sessions = user logbook (not Dashboard label in UI)
  - Profile = public profile page
  - Feed = social feed
  - Compete = coming soon
- **Core tables**
  - profiles, sessions, catches, posts, post_likes, post_comments, follows, businesses

## Step 1 – Review navigation files
1. Open and read:
   - `src/components/navigation/BottomNav.tsx`
   - `src/components/navigation/Sidebar.tsx`
   - `src/components/navigation/MobileHeader.tsx`
2. Understand how mobile and desktop navigation are wired.
3. Note any mismatches vs the desired nav structure.
4. Summarise findings in the response as:
   - `Navigation files reviewed ✓` or list mismatches.

## Step 2 – Verify mobile navigation (BottomNav.tsx)
1. Confirm bottom nav has **exactly 5 items**:
   - Feed (home icon) → `/feed`
   - Explore (map icon) → `/explore`
   - Post (FAB / center button) → **opens CreatePostModal** only
   - Sessions (calendar icon) → `/dashboard`
   - Profile (user icon) → `/profile`
2. Check labels/text so that Sessions is not called "Dashboard".
3. If mismatches exist, adjust icons, labels, and routes.
4. Report:
   - `Mobile nav verified ✓` or list concrete issues and fixes applied.

## Step 3 – Verify desktop navigation (Sidebar.tsx)
1. Confirm sidebar has **exactly 6 items**:
   - Feed → `/feed`
   - Sessions (labelled "Sessions", not "Dashboard") → `/dashboard`
   - Explore → `/explore`
   - Compete → `/compete` (page can be a simple "Coming Soon" placeholder)
   - Profile → `/profile`
   - Post button → opens CreatePostModal (does **not** navigate directly)
2. Ensure the Compete route exists even if it is a placeholder.
3. If mismatches exist, correct route paths, labels, and behaviours.
4. Report:
   - `Desktop nav verified ✓` or list issues.

## Step 4 – Check component names and legacy labels
1. Search the codebase for:
   - `Dashboard` (especially in navigation labels and headings).
   - `TheSwim` (legacy branding). 
   - Direct navigation to `/sessions/new` from any `+` / Post button.
2. Tools to use (one at a time):
   - `grep_search` with queries like `"Dashboard"`, `"TheSwim"`, `"/sessions/new"`.
3. For each occurrence:
   - If it is a **nav label**, rename to `Sessions`.
   - If it is `TheSwim`, remove or replace with neutral `Fishing App`.
   - If a Post button navigates directly to `/sessions/new`, refactor it to open CreatePostModal instead.
4. List all touched files and the change type in the final report.

## Step 5 – Verify key routes in App.tsx
1. Open `src/App.tsx`.
2. Confirm routes are wired as follows:
   - `/feed` → `FeedView`
   - `/profile` → `ProfilePage`
   - `/profile/:userId` → `UserProfilePage`
   - `/dashboard` → `Dashboard`/Sessions list page
   - `/sessions/new` → `StartSessionPage`
   - `/sessions/:id` → `SessionDetailPage`
   - `/explore` → `ExplorePage` (can be partial/placeholder)
   - `/compete` → placeholder "Compete coming soon"
3. If any mismatch, adjust the element or path.
4. Report:
   - `Routes verified ✓` or list discrepancies.

## Step 6 – Check Post button behaviour
1. Identify all **Post / +** entry points:
   - Mobile FAB in `BottomNav.tsx` or related components.
   - Desktop Post button in `Sidebar.tsx` or header.
2. Ensure each of these:
   - Opens `CreatePostModal` (or equivalent) with options:
     - Start Session
     - Log a Catch (can be placeholder)
     - Share Photo (can be placeholder)
   - Does **not** navigate directly to `/sessions/new`.
3. If any button performs navigation instead of opening a modal, refactor it to:
   - Manage local state (`isPostModalOpen`), and
   - Render `CreatePostModal` when open.
4. Report:
   - `Post button behavior correct ✓` or describe deviations and fixes.

## Step 7 – Remove branding issues ("TheSwim")
1. Search for `TheSwim` (case-insensitive) across the repo using `grep_search`.
2. Check and fix at minimum:
   - Component files (headers, logos, nav labels).
   - `Sidebar.tsx` logo/brand area.
   - `MobileHeader.tsx` title/brand.
   - `index.html` `<title>` tag.
   - `package.json` `name`/`description` fields.
3. Replace with neutral text:
   - Prefer `Fishing App`, `Fishing`, or leave blank where a brand is not required.
4. Keep changes minimal and consistent with existing design.
5. Report:
   - `Branding cleaned ✓` and list all files modified.

## Step 8 – Verify mobile/desktop feature parity
1. Confirm that on **mobile** (bottom nav + headers) and **desktop** (sidebar + content) the user can reach:
   - Feed
   - Sessions list
   - Start Session
   - Explore
   - Compete (or its placeholder)
   - Profile
   - Settings (via Profile → gear icon or similar)
2. For each feature, identify the navigation path on both form factors.
3. If any feature is missing on one platform, note it and, where straightforward, add a link/button consistent with existing UI.
4. Report:
   - `Feature parity confirmed ✓` or list specific gaps and suggested fixes.

## Step 9 – Summary report
1. Count and record:
   - Total issues found.
   - Issues fixed in this run.
2. List all files modified.
3. List any remaining issues or open questions.
4. In the final response, provide a concise summary in this structure:
   - `Total issues found: X`
   - `Issues fixed: Y`
   - `Files modified: [...]`
   - `Remaining issues: [...]` (or `None`)
   - `Status: Architecture aligned ✅` or `Status: Issues remain ⚠️`.

## Completion criteria
- Mobile nav has exactly 5 correct items.
- Desktop nav has exactly 6 correct items.
- No `Dashboard` labels in navigation (only `Sessions`).
- No `TheSwim` branding left anywhere.
- + / Post buttons open the CreatePostModal and do not navigate directly.
- Routes in `App.tsx` match the Phase 2C expectations.
- Core features are reachable on both mobile and desktop.
- Deprecated/Phase 2A patterns removed or noted.

When all conditions are met, end the run with:

> Architecture Alignment Workflow Complete ✅
