---
description: Build Competitions Foundation (Phase 2D Week 1)
---
CREATE WORKFLOW: "Build Competitions Foundation (Phase 2D Week 1)"

I want to save this as a workflow that creates the complete database schema, types, and hooks for the competitions system. This is the foundation before building any UI.

═══════════════════════════════════════════════════════════════

WORKFLOW NAME: Build Competitions Foundation

DESCRIPTION: 
Creates the database tables, RLS policies, TypeScript types, and React Query hooks needed for the competitions system. Supports multiple competition types (heaviest fish, most catches, species diversity, photo contests) with leaderboards and entry management.

═══════════════════════════════════════════════════════════════

COMPETITION TYPES SUPPORTED:

1. HEAVIEST FISH
   - Single heaviest catch wins
   - Measured by weight (kg)
   - Species-specific or open

2. MOST CATCHES
   - Most fish caught wins
   - Count-based scoring
   - Can filter by species

3. SPECIES DIVERSITY
   - Most different species wins
   - Unique species count
   - Encourages exploration

4. PHOTO CONTEST
   - Best catch photo wins
   - Voting-based
   - Community judged

COMPETITION FEATURES:
- Time-based (start/end dates)
- Geographic restrictions (optional)
- Species restrictions (optional)
- Entry fees (optional)
- Prizes (text description)
- Public/Private/Friends-only
- Leaderboard with live rankings
- Automatic scoring
- Manual winner declaration

═══════════════════════════════════════════════════════════════

WORKFLOW TASKS:

Task 1: Create Competitions Table
[SQL for competitions table and RLS policies as provided in the workflow spec.]

Task 2: Create Competition Entries Table
[SQL for competition_entries table and RLS policies.]

Task 3: Create Competition Invites Table
[SQL for competition_invites table and RLS policies.]

Task 4: Create Competition Participant Count View
[SQL for competition_stats view.]

Task 5: Create Score Calculation Function
[SQL for calculate_competition_score() function.]

Task 6: Create Update Leaderboard Function
[SQL for update_competition_leaderboard() function.]

Task 7: Create Auto-Update Status Function
[SQL for update_competition_status() and optional cron job comment.]

Task 8: Add Competition Types to TypeScript
[Type definitions for CompetitionType, CompetitionStatus, WaterType, InviteStatus, Competition, CompetitionEntry, CompetitionInvite in src/types/index.ts.]

Task 9: Create useCompetitions Hook
[React Query hooks in src/hooks/useCompetitions.ts for fetching/creating/updating/deleting competitions and querying active/upcoming/my competitions, plus hooks for entered competitions.]

Task 10: Create useCompetitionEntries Hook
[React Query hooks in src/hooks/useCompetitionEntries.ts for leaderboard, user entry, submit/withdraw entry, using the SQL functions above.]

Task 11: Create Database Triggers
[Trigger to keep competitions.updated_at current on update.]

Task 12: Test Database Schema
[Manual test steps: insert test competition, entries, run score/leaderboard/status functions, verify queries.]

Task 13: Test TypeScript Types
[Verify types compile and autocomplete works.]

Task 14: Test Hooks
[Verify each hook fetches/mutates correctly and invalidates queries; toast usage is optional to wire later.]

Task 15: Document Competition System
[Create docs/COMPETITIONS.md describing competition types, tables, functions, and example hook usage.]

Task 16: Final Verification
[Checklist ensuring all foundation tasks completed and no DB/TS errors.]

═══════════════════════════════════════════════════════════════

WORKFLOW SUCCESS CRITERIA:

✅ All database tables created (competitions, competition_entries, competition_invites)
✅ RLS policies secure
✅ Functions calculate scores correctly
✅ Leaderboard ranks properly
✅ Status auto-update function works
✅ TypeScript types added
✅ Hooks for competitions and entries created
✅ Database triggers created
✅ Documentation written
✅ No database or TypeScript errors

FOUNDATION COMPLETE ✅

Ready for Week 2: Build Competition UI (browse, detail, create, enter, leaderboards).
