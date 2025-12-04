-- Migration: Create competition_winners table
-- Description: Tracks multiple winners per competition in different categories

-- Table: Track multiple winners per competition
create table if not exists competition_winners (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  category text not null, -- 'heaviest_fish', 'most_species', 'most_catches', custom, etc.
  catch_id uuid references catches(id) on delete set null, -- The winning catch (if applicable)
  notes text, -- Organizer notes about this winner
  declared_at timestamptz not null default now(),
  declared_by uuid not null references profiles(id), -- Organizer who declared
  
  -- Constraint: Can't win same category twice in same competition
  unique(competition_id, user_id, category)
);

-- Indexes
create index idx_competition_winners_competition 
  on competition_winners(competition_id);
  
create index idx_competition_winners_user 
  on competition_winners(user_id);
  
create index idx_competition_winners_category 
  on competition_winners(competition_id, category);

-- RLS Policies
alter table competition_winners enable row level security;

-- Everyone can view winners
create policy "Winners visible to all"
  on competition_winners for select
  using (true);

-- Only organizer can declare winners
create policy "Only organizer can declare winners"
  on competition_winners for insert
  with check (
    exists (
      select 1 from competitions c
      where c.id = competition_winners.competition_id
        and c.created_by = auth.uid()
    )
  );

-- Only organizer can update/delete winners
create policy "Only organizer can modify winners"
  on competition_winners for all
  using (
    exists (
      select 1 from competitions c
      where c.id = competition_winners.competition_id
        and c.created_by = auth.uid()
    )
  );

comment on table competition_winners is 
  'Tracks multiple winners per competition (e.g., heaviest fish, most species, etc.)';
comment on column competition_winners.category is 
  'Winner category - can be predefined (heaviest_fish, most_species) or custom';
comment on column competition_winners.catch_id is 
  'Optional reference to the specific winning catch';
