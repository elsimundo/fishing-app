-- Migration: Add time adjustment tracking to competitions
-- Description: Allows organizers to adjust competition end time with audit trail

-- Add time adjustment tracking
alter table competitions add column if not exists original_ends_at timestamptz;
alter table competitions add column if not exists time_adjusted_count int default 0;
alter table competitions add column if not exists last_adjusted_at timestamptz;
alter table competitions add column if not exists last_adjusted_by uuid references profiles(id);

comment on column competitions.original_ends_at is 
  'Original end time before any adjustments (null if never adjusted)';
comment on column competitions.time_adjusted_count is 
  'Number of times organizer has adjusted the end time';
comment on column competitions.last_adjusted_at is 
  'Timestamp of most recent time adjustment';
comment on column competitions.last_adjusted_by is 
  'User ID of organizer who made the most recent time adjustment';
