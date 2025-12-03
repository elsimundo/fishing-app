---
description: Build Collaborative Sessions (Join as Viewer/Contributor)
---

## Goal

Implement **collaborative sessions** so multiple users can join a session with three roles:

- **Owner** – creates the session, full control
- **Contributor** – can add/edit/delete *their own* catches in the session
- **Viewer** – read-only (watch, like, comment)

This enables:
- Group fishing trips
- Teaching/mentoring sessions
- Club events and shared outings

---

## Pre-requisites

1. You already have:
   - `sessions` table
   - `catches` table
   - `profiles` table
   - Existing RLS on `sessions`/`catches`
2. You are using Supabase with RLS enabled.
3. Frontend uses TypeScript, React, and React Query.

> Run all SQL steps in **Supabase SQL Editor**. Run all code steps in your app repo.

---

## Task 1 – Create `session_participants` table

**Where:** Supabase SQL Editor

1. Create the participants table:

```sql
-- Session participants table
create table session_participants (
  id uuid primary key default uuid_generate_v4(),

  session_id uuid references sessions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,

  role text not null check (role in ('owner', 'contributor', 'viewer')),

  -- Timestamps
  invited_at timestamptz default now() not null,
  joined_at timestamptz,
  left_at timestamptz,

  -- Status
  status text default 'pending' check (status in ('pending', 'active', 'left', 'removed')),

  -- Constraints
  unique(session_id, user_id)
);

-- Indexes
create index session_participants_session_id_idx on session_participants(session_id);
create index session_participants_user_id_idx on session_participants(user_id);
create index session_participants_status_idx on session_participants(status);

-- RLS
alter table session_participants enable row level security;

-- Can view participants if you're in the session or session is public
create policy "Participants viewable by session members"
  on session_participants for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from session_participants sp2
      where sp2.session_id = session_participants.session_id
      and sp2.user_id = auth.uid()
      and sp2.status = 'active'
    ) or
    exists (
      select 1 from sessions s
      where s.id = session_participants.session_id
      and s.is_public = true
    )
  );

-- Owner can insert participants (invite)
create policy "Owner can invite participants"
  on session_participants for insert
  with check (
    exists (
      select 1 from session_participants sp
      where sp.session_id = session_participants.session_id
      and sp.user_id = auth.uid()
      and sp.role = 'owner'
    )
  );

-- Users can update their own participation (accept/decline)
create policy "Users can update own participation"
  on session_participants for update
  using (auth.uid() = user_id);

-- Owner can update any participant (change roles, remove)
create policy "Owner can manage participants"
  on session_participants for update
  using (
    exists (
      select 1 from session_participants sp
      where sp.session_id = session_participants.session_id
      and sp.user_id = auth.uid()
      and sp.role = 'owner'
    )
  );

-- Users can delete their own participation (leave)
create policy "Users can leave session"
  on session_participants for delete
  using (auth.uid() = user_id);
```

**Report:** `session_participants table created ✓`

---

## Task 2 – Auto-create owner participant

**Where:** Supabase SQL Editor

1. Create trigger function and trigger to auto-add owner as participant for each new session:

```sql
create or replace function add_session_owner_participant()
returns trigger as $$
begin
  insert into session_participants (
    session_id,
    user_id,
    role,
    status,
    joined_at
  ) values (
    new.id,
    new.user_id,
    'owner',
    'active',
    now()
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger session_owner_participant_trigger
  after insert on sessions
  for each row
  execute function add_session_owner_participant();
```

**Report:** `Owner participant auto-creation trigger added ✓`

---

## Task 3 – Verify `catches` supports multi-user

**Where:** Supabase SQL Editor

1. Check the `catches` table has the right columns:

```sql
select column_name, data_type 
from information_schema.columns 
where table_name = 'catches';
```

You should see **both**:
- `session_id uuid` – which session this catch belongs to
- `user_id uuid` – who logged the catch

2. If `user_id` is missing, add and backfill:

```sql
alter table catches add column user_id uuid references profiles(id);

update catches c
set user_id = s.user_id
from sessions s
where c.session_id = s.id
  and c.user_id is null;

alter table catches alter column user_id set not null;
```

**Report:** `Catches table verified for multi-user ✓`

---

## Task 4 – Update catches RLS for contributors

**Where:** Supabase SQL Editor

1. Replace existing catches policies with role-aware ones:

```sql
-- Insert: contributors + owners can add catches
 drop policy if exists "Users can create catches" on catches;

create policy "Session participants can create catches"
  on catches for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from session_participants sp
      where sp.session_id = catches.session_id
      and sp.user_id = auth.uid()
      and sp.role in ('owner', 'contributor')
      and sp.status = 'active'
    )
  );

-- Update: only catch creator
 drop policy if exists "Users can update own catches" on catches;

create policy "Users can update own catches"
  on catches for update
  using (auth.uid() = user_id);

-- Delete: owner or catch creator
 drop policy if exists "Users can delete own catches" on catches;

create policy "Owner or catch creator can delete"
  on catches for delete
  using (
    auth.uid() = user_id or
    exists (
      select 1 from session_participants sp
      where sp.session_id = catches.session_id
      and sp.user_id = auth.uid()
      and sp.role = 'owner'
    )
  );
```

**Report:** `Catches RLS updated for contributors ✓`

---

## Task 5 – Add TypeScript types

**Where:** `src/types/index.ts`

1. Add participant-related types:

```ts
export type ParticipantRole = 'owner' | 'contributor' | 'viewer'
export type ParticipantStatus = 'pending' | 'active' | 'left' | 'removed'

export interface SessionParticipant {
  id: string
  session_id: string
  user_id: string
  role: ParticipantRole
  status: ParticipantStatus
  invited_at: string
  joined_at: string | null
  left_at: string | null

  // Relations
  user?: Profile
}
```

2. Extend `Session`:

```ts
export interface Session {
  // ...existing fields
  participants?: SessionParticipant[]
  participant_count?: number
  my_role?: ParticipantRole
}
```

3. Extend `Catch` for attribution:

```ts
export interface Catch {
  // ...existing fields
  user_id: string
  logged_by?: Profile
}
```

**Report:** `Participant types added ✓`

---

## Task 6 – `useSessionParticipants` hooks

**Where:** `src/hooks/useSessionParticipants.ts`

1. Create the hooks module implementing:
   - `useSessionParticipants(sessionId)` – list active participants + profile
   - `useMySessionRole(sessionId)` – resolves current user role
   - `useInviteToSession()` – owner invites contributor/viewer
   - `useAcceptInvitation()` – invited user accepts
   - `useLeaveSession()` – participant leaves session
   - `useChangeParticipantRole()` – owner upgrades/downgrades
   - `useRemoveParticipant()` – owner removes participant

2. Use the implementation from the user’s spec (already written in the prompt) with React Query + Supabase + `react-hot-toast`.

**Report:** `useSessionParticipants hooks created ✓`

---

## Task 7 – `ParticipantsList` component

**Where:** `src/components/session/ParticipantsList.tsx`

1. Implement `ParticipantsList` as in the spec:
   - Uses `useSessionParticipants` + `useMySessionRole`.
   - Displays avatar, name, and **role badge** for each participant.
   - Shows a kebab menu (`MoreVertical`) for owner to manage contributors/viewers.
2. Implement a simple `ParticipantMenu` placeholder with options:
   - Change to Contributor
   - Change to Viewer
   - Remove from Session

> Wire these menu actions to `useChangeParticipantRole` / `useRemoveParticipant` once the hooks are available.

**Report:** `ParticipantsList component created ✓`

---

## Task 8 – `InviteToSessionModal` component

**Where:** `src/components/session/InviteToSessionModal.tsx`

1. Implement modal per spec:
   - Role selector: **Contributor** vs **Viewer**.
   - Username search (Supabase `profiles` table, `ilike` on `username`/`full_name`).
   - List results with avatar, name, username.
   - Clicking a user calls `useInviteToSession`.

2. Ensure:
   - Current user is excluded from search.
   - Loading / empty / “no users found” states are handled.

**Report:** `InviteToSessionModal component created ✓`

---

## Task 9 – Update `SessionDetailPage`

**Where:** `src/pages/SessionDetailPage.tsx`

1. Import collaboration pieces:
   - `useSessionParticipants`, `useMySessionRole`
   - `ParticipantsList`
   - `InviteToSessionModal`
   - `UserPlus` icon

2. Compute:
   - `myRole` via `useMySessionRole`.
   - `isOwner`, `isContributor`, `canAddCatches`.

3. In the session detail layout:
   - Show **role badge** near the header using `myRole`.
   - Insert `<ParticipantsList sessionId={id} />` section.
   - If `isOwner`, show **Invite People to Session** button that toggles `showInviteModal`.
   - If `canAddCatches`, show **Log Catch** button for contributors/owner.
   - Render `<InviteToSessionModal />` when `showInviteModal` is true.

**Report:** `SessionDetailPage updated with participants ✓`

---

## Task 10 – Show who logged each catch

**Where:** Catch display components (e.g. `CatchCard`)

1. Update Supabase queries to join `profiles` for `logged_by` (optional but ideal).
2. In the UI, show attribution:

```tsx
<div className="flex items-center gap-2 text-xs text-gray-600">
  {catch.logged_by?.avatar_url ? (
    <img
      src={catch.logged_by.avatar_url}
      className="w-5 h-5 rounded-full"
      alt={catch.logged_by.username || 'User'}
    />
  ) : (
    <div className="w-5 h-5 rounded-full bg-gray-300" />
  )}
  <span>Logged by @{catch.logged_by?.username}</span>
</div>
```

**Report:** `Catch attribution display added ✓`

---

## Task 11 – Invitation visibility / notifications (optional)

**Where:** Supabase SQL Editor (+ optional page)

1. Create a simple view for pending invites:

```sql
create or replace view my_pending_invitations as
select 
  sp.*,
  s.title as session_title,
  inviter.username as inviter_username
from session_participants sp
join sessions s on sp.session_id = s.id
join profiles inviter on s.user_id = inviter.id
where sp.user_id = auth.uid()
  and sp.status = 'pending';
```

2. Optionally, create `InvitationsPage.tsx` to list invites and call `useAcceptInvitation()`.

**Report:** `Invitation notifications added ✓` or `Deferred for later`

---

## Task 12 – Test collaborative session flow

1. **Scenario: Two users fishing together**

   - Owner (User A):
     - [ ] Create session `Boat Trip`.
     - [ ] Open Invite modal, search for User B.
     - [ ] Invite as **Contributor**.
     - [ ] See User B as pending/active in participants list.

   - Contributor (User B):
     - [ ] See invitation (via view / page).
     - [ ] Accept invitation.
     - [ ] Open the session detail.
     - [ ] Use **Log Catch** to add a new catch.
     - [ ] Catch appears in session, attributed to `@UserB`.

   - Both:
     - [ ] Both see all catches in that session.
     - [ ] User B can only edit/delete *their* catches.
     - [ ] User A can delete any catch.

**Report:** `Collaborative session tested ✅` or list issues.

---

## Task 13 – Add "Leave Session" button

**Where:** `SessionDetailPage`

1. For non-owner participants:

```tsx
{myRole && myRole !== 'owner' && (
  <button
    type="button"
    onClick={handleLeaveSession}
    className="px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50"
  >
    Leave Session
  </button>
)}
```

2. Wire `handleLeaveSession` to `useLeaveSession()`.

**Report:** `Leave session button added ✓`

---

## Task 14 – Test viewer role

1. Invite User C as **Viewer**.
2. Verify:
   - [ ] Can see session and all catches.
   - [ ] Can comment and like (if implemented).
   - [ ] Cannot see catch logging controls.
   - [ ] Cannot edit session.
   - [ ] Can leave session.

**Report:** `Viewer role tested ✅`

---

## Task 15 – Add role badge to session header

**Where:** `SessionDetailPage`

1. Near the session title, render a badge using `myRole`:

```tsx
{myRole && (
  <div
    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
      myRole === 'owner'
        ? 'bg-yellow-100 text-yellow-800'
        : myRole === 'contributor'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-gray-100 text-gray-800'
    }`}
  >
    {myRole === 'owner' && '👑 Owner'}
    {myRole === 'contributor' && '✏️ Contributor'}
    {myRole === 'viewer' && '👁️ Viewer'}
  </div>
)}
```

**Report:** `Role badge added to session header ✓`

---

## Task 16 – Final verification checklist

Confirm the following:

- **Database**
  - [ ] `session_participants` table and indexes exist.
  - [ ] Owner auto-added trigger works on new sessions.
  - [ ] `catches` has `session_id` and `user_id` (not null).
  - [ ] RLS allows only owners/contributors to insert catches.
  - [ ] Viewers cannot create or modify catches.

- **Hooks**
  - [ ] `useSessionParticipants` returns correct list.
  - [ ] `useMySessionRole` returns role/null appropriately.
  - [ ] `useInviteToSession` invites successfully.
  - [ ] `useAcceptInvitation` activates participation.
  - [ ] `useLeaveSession` marks user as left.
  - [ ] `useChangeParticipantRole` updates roles.
  - [ ] `useRemoveParticipant` marks participant removed.

- **UI**
  - [ ] Participants list shows avatars, names, and roles.
  - [ ] Invite modal works and respects chosen role.
  - [ ] Role badge is visible on session header.
  - [ ] Add Catch button appears only for owner/contributors.
  - [ ] Catches show who logged them.
  - [ ] Leave Session button works for non-owners.
  - [ ] Mobile layout remains usable.

**Report:** `Build Collaborative Sessions Workflow Complete ✅`

---

## Summary

After completing this workflow you will have:

- Collaborative sessions with **Owner / Contributor / Viewer** roles.
- Secure RLS so only the right people can add or edit catches.
- An invite system for adding participants by role.
- Clear attribution of who logged each catch.
- UI components for participant lists, inviting, leaving, and role display.

This forms a solid foundation for:

- Group fishing trips (shared live log).
- Teaching/mentoring flows.
- Club trips and internal events.
- Future collaborative features elsewhere in the app.
