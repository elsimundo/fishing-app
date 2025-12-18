---
description: Competitions system architecture and integration guide
---

# Competitions System Workflow

This workflow documents the competitions system architecture, how it integrates with challenges, and how to extend it.

## System Overview

**Key Concept: A Competition IS a Session**

The competitions system works by:
1. **Creating a competition** creates a linked collaborative session (`competition.session_id`)
2. **Users JOIN** by becoming participants on that session (`session_participants` table)
3. **Catches are logged** to the shared competition session by all participants
4. **Leaderboard** is calculated from catches in that shared session
5. **Winners** are declared by the organizer when competition ends

## Database Tables

### competitions
Main competition data including:
- `id`, `created_by`, `title`, `description`
- `session_id` - **The backing session that participants join**
- `type`: `heaviest_fish`, `most_catches`, `species_diversity`, `photo_contest`
- `status`: `upcoming`, `active`, `ended`, `cancelled`
- `starts_at`, `ends_at`
- `entry_fee`, `prizes`, `max_participants`
- `is_public`, `invite_only`
- `allowed_species`, `water_type`, `location_restriction`

### session_participants (PRIMARY - for joining competitions)
How users join competitions:
- `session_id` - Links to `competition.session_id`
- `user_id` - The participant
- `role`: `contributor` (for competition participants)
- `status`: `active`, `pending`, `left`

### competition_entries (LEGACY - backwards compatibility)
Old participation model:
- `competition_id`, `user_id`, `session_id`
- `score`, `rank`
- `submitted_at`, `updated_at`

### competition_winners
Winner declarations:
- `competition_id`, `user_id`, `category`
- `catch_id` (optional), `notes`
- `declared_at`

### competition_invites
Invite system:
- `competition_id`, `inviter_id`, `invitee_id`
- `status`: `pending`, `accepted`, `declined`

## Key Hooks

### useCompetitions.ts
- `useActiveCompetitions()` - Public active competitions
- `useUpcomingCompetitions()` - Public upcoming competitions
- `useCompetition(id)` - Single competition details
- `useMyCompetitions()` - Competitions I created
- `useMyEnteredCompetitions()` - Competitions I've entered
- `useCreateCompetition()` - Create new competition
- `useUpdateCompetition()` - Update competition
- `useDeleteCompetition()` - Delete competition

### useCompetitionEntries.ts
- `useCompetitionLeaderboard(id)` - Get ranked entries
- `useUserEntry(id)` - Get current user's entry
- `useSubmitEntry()` - Enter a competition (triggers `comp_entered` challenge)
- `useWithdrawEntry()` - Leave a competition

### useCompetitionWinners.ts
- `useCompetitionWinners(id)` - Get declared winners
- `useDeclareWinner()` - Declare a winner (triggers `comp_winner`, `comp_podium` challenges)
- `useRemoveWinner()` - Remove winner declaration

## Challenge Integration

### Entry Challenges (useCompetitionEntries.ts)
When a user submits an entry via `useSubmitEntry()`:
- Counts total competition entries for user
- Awards `comp_entered` challenge (1st competition)
- Awards `comp_5_entered` challenge (5 competitions)

### Winner Challenges (useCompetitionWinners.ts)
When a winner is declared via `useDeclareWinner()`:
- Awards `comp_winner` challenge to the winner
- Awards `comp_podium` challenge if user is in top 3

## Pages

### /compete (CompetePage.tsx)
- Lists "Your Competitions" (entered)
- Lists "Available to Join" (public active)
- "Create" button to create new competition

### /compete/create (CreateCompetitionPage.tsx)
- Form to create a new competition
- Set type, dates, restrictions, prizes

### /compete/:id (CompetitionDetailPage.tsx)
- Competition details and rules
- Leaderboard
- Enter/withdraw functionality
- Winner declaration (for organizer)

## Competition Types

### heaviest_fish
- Score = weight of heaviest catch
- Can filter by species

### most_catches
- Score = total catch count
- Can filter by species

### species_diversity
- Score = unique species count
- Encourages variety

### photo_contest
- Community voting (manual winner declaration)
- Judged competitions

## Adding New Features

### To add a new competition type:
1. Add type to `CompetitionType` in `src/types/index.ts`
2. Update `calculate_competition_score()` SQL function
3. Update UI in CreateCompetitionPage and CompetitionDetailPage

### To add new challenges:
1. Add challenge to `challenges` table via migration
2. Add tracking logic in appropriate hook
3. Update challenge audit documentation

## RPC Functions

### calculate_competition_score
Calculates score based on competition type and session catches.

### update_competition_leaderboard
Recalculates rankings for all entries.

### get_competition_leaderboard
Returns ranked entries with user profiles.

### declare_competition_winner
Records a winner and triggers notifications.

## Testing Checklist

- [ ] Create competition with each type
- [ ] Enter competition with session
- [ ] Verify leaderboard updates
- [ ] Declare winner and verify challenge awards
- [ ] Test private/invite-only competitions
- [ ] Test species/water type restrictions
