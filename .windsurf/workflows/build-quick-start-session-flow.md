---
description: Build Quick Start Session Flow
---

Completely replaces `StartSessionPage.tsx` with a modern session creation flow that offers a one-tap **Quick Start** and a multi-step **Full Setup** wizard.

## Preconditions
- Project is the Fishing App (React, TS, Vite, Tailwind, Supabase).
- `src/pages/StartSessionPage.tsx` exists and is the current entry for `/sessions/new`.
- `sessions` table matches the schema described at the end of this file.

## Step 1 – Backup existing StartSessionPage
1. Locate `src/pages/StartSessionPage.tsx`.
2. Duplicate it as `src/pages/StartSessionPage.backup.tsx`.
3. Do **not** modify the backup after creating it.
4. Report in your response: `Backup created ✓`.

## Step 2 – Create new StartSessionPage skeleton
1. Replace the contents of `src/pages/StartSessionPage.tsx` entirely.
2. New imports (adjust aliases if the project does not use `@/`):
   - `useState` from `react`.
   - `useNavigate` from `react-router-dom`.
   - `supabase` from `../lib/supabase` (or `@/lib/supabase` if aliases are configured).
   - `useAuth` from `../hooks/useAuth` (or `@/hooks/useAuth`).
   - `Loader2`, `ChevronRight` from `lucide-react`.
3. Define state:
   - `step: number` (0 = choice, 1–4 = Full Setup steps).
   - `loading: boolean`.
   - `loadingMessage: string`.
   - `showSuccess: boolean`.
   - `createdSessionId?: string`.
   - `formData` object containing:
     - `locationName?: string`.
     - `title: string`.
     - `waterType?: 'saltwater' | 'freshwater'`.
     - `privacy: 'private' | 'general' | 'exact'` (default `'general'`).
     - `notes?: string`.
4. Export a default `StartSessionPage` component that renders a layout wrapper and conditionally renders:
   - Choice screen (step 0) when `!loading && !showSuccess && step === 0`.
   - Full Setup step content for steps 1–4.
   - Loading screen when `loading && !showSuccess`.
   - Success screen when `showSuccess`.
5. Report: `New structure created ✓`.

## Step 3 – Implement Step 0 (choice screen)
1. In step 0, render:
   - Header row with:
     - Title: `Start Session`.
     - Right-aligned `Cancel` button that calls `navigate(-1)`.
   - Main title: `Start your session`.
   - Subtitle: `Choose how you'd like to begin your fishing session.`
2. Render two large choice cards side by side on desktop, stacked on mobile:
   - **Quick Start ⚡** card:
     - Icon: `⚡` inside a navy circle (`bg-navy-800 text-white`).
     - Title: `Quick Start`.
     - Subtitle: `Use current location & smart defaults`.
     - Arrow (`ChevronRight`) with navy color.
     - Styling: `bg-gray-50 border-2 border-navy-800` (highlighted, recommended).
     - `onClick`: `handleQuickStart()`.
   - **Full Setup ⚙️** card:
     - Icon: `⚙️` inside blue circle (`bg-blue-100 text-blue-600`).
     - Title: `Full Setup`.
     - Subtitle: `Customize location, privacy, and details`.
     - Arrow with gray color.
     - Styling: `bg-white border-2 border-gray-200`.
     - `onClick`: `handleFullSetup()`.
3. Below the cards, show helper text:
   - `💡 Quick Start defaults: Uses your current GPS location, general area privacy, and auto-detects water type. You can edit everything later.`
4. Use Tailwind classes consistent with the app: rounded-xl, px-4/py-4, flex layout, hover state.
5. Report: `Step 0 created ✓`.

## Step 4 – Implement Quick Start flow
1. Define `async function handleQuickStart()`:
   - Set `loading = true`, `step = 0`, `showSuccess = false`.
   - Set initial `loadingMessage = 'Getting your location...'`.
2. Simulate staged loading messages:
   - `await new Promise((r) => setTimeout(r, 1000))`, then `loadingMessage = 'Detecting water type...'`.
   - Another second, then `loadingMessage = 'Setting up your session...'`.
3. Get the current user via `useAuth` (already available from the hook).
4. Build default title:
   ```ts
   const now = new Date()
   const title = `Fishing Session - ${now.toLocaleDateString('en-GB', {
     day: 'numeric',
     month: 'short',
     year: 'numeric',
   })}`
   ```
5. Insert session into `sessions` using Supabase:
   ```ts
   const { data, error } = await supabase
     .from('sessions')
     .insert({
       user_id: user.id,
       title,
       location_name: 'Current Location',
       water_type: 'saltwater', // default
       location_privacy: 'general',
       latitude: 0, // TODO: wire GPS later
       longitude: 0,
       started_at: now.toISOString(),
       is_public: true,
     })
     .select()
     .single()
   ```
6. On error:
   - Set `loading = false`.
   - Show a simple error message (toast or alert) and return.
7. On success:
   - Save `createdSessionId = data.id`.
   - Set `loading = false`, `showSuccess = true`.
   - Option 1: Immediately navigate to detail: `navigate(`/sessions/${data.id}`)`.
   - Option 2 (preferred): Show success screen for ~2s, then navigate in `useEffect` or via `setTimeout`.
8. Report: `Quick Start flow implemented ✓`.

## Step 5 – Full Setup entry (handleFullSetup)
1. Implement `handleFullSetup()`:
   - Set `step = 1`.
   - Ensure `loading = false`, `showSuccess = false`.
2. Add a simple progress bar component at the top of the page when `step >= 1 && step <= 4`:
   - Background: `bg-gray-200 h-1`.
   - Fill: `bg-navy-800 h-1` with width computed as `(step / 4) * 100%`.
3. In the header when in steps 1–4:
   - Left: `Back` button that calls `handleBack()`.
   - Center: Title appropriate to the step.
   - Optional right: step label.
4. At the bottom of the page, render a primary action button whose label changes per step (e.g. `Continue` until final step, then `Start Session`).
5. Report: `Full Setup entry created ✓`.

## Step 6 – Step 1 (Location & Title)
1. For `step === 1`, render:
   - Title: `Where are you fishing?`.
   - Subtitle: `Set your spot and give your session a name.`
2. Location picker card:
   - Base styling: `bg-white border-2 border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-navy-800`.
   - Left section:
     - Icon circle: `📍` with `bg-blue-100 text-blue-600`.
     - Text:
       - Main: `Choose location` or the selected `locationName`.
       - Subtext: `Tap to set your fishing spot`.
   - Right: small `Set` label in blue.
   - On click:
     - For now, simulate selection:
       - `setFormData((f) => ({ ...f, locationName: 'Brighton Marina' }))`.
3. When `locationName` is set, apply selected styling:
   - Border `border-navy-800`, background `bg-gray-50`.
4. Session title input:
   - Label: `Session Title *`.
   - Text input with placeholder `e.g., Morning Bass Session`.
   - Two-way bind to `formData.title`.
5. Validation:
   - Bottom `Continue` button disabled unless both `locationName` and `title` are truthy.
6. Helper text under inputs:
   - `💡 Give your session a memorable name`.
7. Report: `Step 1 created ✓`.

## Step 7 – Step 2 (Water Type)
1. For `step === 2`, render:
   - Title: `What type of water?`.
   - Subtitle: `This helps us show you the right species and fishing data.`
2. Two cards:
   - **Saltwater 🌊**:
     - Icon circle: `bg-blue-100`.
     - Title + description `Sea, ocean, coastal fishing`.
   - **Freshwater 🏞️**:
     - Icon circle: `bg-emerald-100`.
     - Title + description `Lakes, rivers, ponds, canals`.
3. Base card styling same as step 1; on selection:
   - Store `formData.waterType`.
   - Selected card: `border-navy-800 bg-gray-50`, checkmark indicator on the right.
4. `Continue` button enabled only when `waterType` is chosen.
5. Report: `Step 2 created ✓`.

## Step 8 – Step 3 (Privacy)
1. For `step === 3`, render:
   - Title: `Location privacy`.
   - Subtitle: `Control how much location detail you share with others.`
2. Three cards:
   - **Private 🔒**:
     - Icon circle: `bg-red-100`.
     - Description: `Location completely hidden`.
   - **General Area 📍** (default):
     - Icon circle: `bg-yellow-100`.
     - Description: `Show approximate location (±5km)`.
     - Set `formData.privacy = 'general'` on entering step 3 if not already set.
   - **Exact Location 🎯**:
     - Icon circle: `bg-emerald-100`.
     - Description: `Share precise GPS coordinates`.
3. Selection logic:
   - One card selected at a time; selected styling same as previous steps.
   - `Continue` button always enabled because a default is selected.
4. Helper text:
   - `💡 You can always change this later. We recommend 'General Area' to protect your fishing spots while still helping the community.`
5. Report: `Step 3 created ✓`.

## Step 9 – Step 4 (Optional Notes)
1. For `step === 4`, render:
   - Title: `Add session details`.
   - Subtitle: `Tell your story! What are you hoping to catch? What's the weather like?`
2. Textarea:
   - Label: `Description (Optional)`.
   - Placeholder with a rich example line about conditions and target species.
   - `rows={6}` and bound to `formData.notes`.
3. Helper text:
   - `📝 You can add photos and catches once your session starts`.
4. Bottom button label: `Start Session` (always enabled).
5. Report: `Step 4 created ✓`.

## Step 10 – Success screen
1. After a successful insert (either Quick Start or Full Setup), set:
   - `showSuccess = true`.
   - `loading = false`.
2. Render a full-screen centered success UI:
   - Large circular icon: `🎣` with `bg-emerald-100 text-emerald-700`, size around `h-20 w-20`.
   - Title: `Session Started!`.
   - Description: `Your fishing session is now active. Start logging catches and share your adventure!`
   - Primary button: `View Active Session` that navigates to `/sessions/${createdSessionId}`.
3. Optionally add a small scale/pulse animation to the icon using Tailwind + CSS transitions.
4. Report: `Success screen created ✓`.

## Step 11 – Navigation and creation logic
1. Implement `handleNext()`:
   - If `step === 1`:
     - Ensure `locationName` and `title` are set; if not, do nothing or show a small validation message.
   - If `step === 2`:
     - Ensure `waterType` is set.
   - If `step === 3`:
     - `privacy` already selected, no extra validation.
   - If `step === 4`:
     - Call `handleCreateSession()` and return (do not increment step).
   - Otherwise: increment `step` by 1.
2. Implement `handleBack()`:
   - If `step > 1`, decrement `step`.
   - If `step === 1`, go back to choice screen (`step = 0`).
   - If already on `step 0`, either call `navigate(-1)` or confirm cancellation.
3. Implement `async handleCreateSession()` for the **Full Setup** path:
   - Build the payload using `formData` and current `user`:
     - `title`, `location_name`, `water_type`, `location_privacy`, `description`.
     - For now, use placeholder `latitude`/`longitude` of `0`.
   - Insert into `sessions` via Supabase and `select().single()`.
   - On error: surface it and do not move to success UI.
   - On success: set `createdSessionId`, toggle `showSuccess` and (optionally) redirect after short delay.
4. Report: `Navigation logic implemented ✓`.

## Step 12 – Tailwind styling
1. Use consistent color palette:
   - Primary: `bg-navy-800 text-white`, hover `bg-navy-900`.
   - Muted backgrounds: `bg-gray-50`.
   - Borders: `border-gray-200` default, `border-navy-800` selected.
   - Text: `text-gray-900`, `text-gray-600`, and `text-gray-400` for secondary.
2. Base card classes:
   - `bg-white border-2 border-gray-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-navy-800 transition-colors`.
3. Selected card classes:
   - Add `border-navy-800 bg-gray-50`.
4. Primary button classes:
   - `w-full rounded-xl bg-navy-800 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-900 disabled:bg-gray-300 disabled:cursor-not-allowed`.
5. Ensure layout works on mobile (stacked) and desktop (centered column, max width).
6. Report: `Styling applied ✓`.

## Step 13 – Responsive wrapper
1. Wrap the page content in a container that:
   - Uses `min-h-screen bg-gray-50`.
   - Centers the content on larger screens: `max-w-2xl mx-auto` with padding `px-4 py-6`.
   - Keeps header and progress bar sticky at top on mobile if needed.
2. Test on narrow and wide viewports to ensure no content is clipped.
3. Report: `Responsive wrapper added ✓`.

## Step 14 – Test Quick Start flow
1. Run the dev server and navigate to `/sessions/new`.
2. On Step 0, tap **Quick Start**.
3. Confirm:
   - Loading screen shows 3 messages in sequence.
   - A new row is created in `sessions` with expected defaults.
   - Success screen appears.
   - You are redirected (or can click button) to `/sessions/{id}`.
4. Report: `Quick Start tested ✓` or describe any issues.

## Step 15 – Test Full Setup flow
1. From `/sessions/new`, choose **Full Setup**.
2. Step 1:
   - Confirm you cannot continue without selecting a location and entering a title.
3. Step 2:
   - Select a water type and continue.
4. Step 3:
   - Confirm `General Area` is selected by default but others can be chosen.
5. Step 4:
   - Optionally enter notes and press **Start Session**.
6. Confirm a new `sessions` row is created with the chosen fields.
7. Confirm success screen and redirect.
8. Report: `Full Setup tested ✓` or issues found.

## Step 16 – Final verification
Ensure all of the following are true:
- Step 0 choice screen renders correctly.
- Quick Start creates a session automatically.
- Full Setup has 4 steps with a working progress bar.
- Location picker uses a placeholder location (e.g. Brighton Marina) for now.
- Water type selection and privacy selection both work.
- Notes are optional and stored in `description`.
- Success screen appears for both flows.
- Redirect to the session detail page works.
- Page looks good on mobile and desktop.
- No console errors and TypeScript compiles.

When everything passes, end the run with:

> Build Quick Start Session Flow Workflow Complete ✅

List any remaining known limitations (e.g. GPS still stubbed at 0,0).

---

### Sessions table reference

`sessions` table columns used by this workflow:
- `id` (uuid)
- `user_id` (uuid) – FK to profiles
- `title` (text)
- `location_name` (text)
- `water_type` (text) – `'saltwater' | 'freshwater'`
- `location_privacy` (text) – `'private' | 'general' | 'exact'`
- `latitude` (numeric)
- `longitude` (numeric)
- `started_at` (timestamptz)
- `ended_at` (timestamptz, nullable)
- `is_public` (boolean)
- `description` (text, nullable)
- `cover_photo_url` (text, nullable)
