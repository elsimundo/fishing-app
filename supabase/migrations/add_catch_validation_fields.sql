-- Migration: Add catch validation fields
-- Description: Adds validation_status, validated_by, rejection_reason, and time override fields to catches table

-- Add validation fields to catches table
alter table catches add column if not exists validation_status text 
  check (validation_status in ('pending', 'approved', 'rejected'))
  default 'approved'; -- Default approved for non-competition catches

alter table catches add column if not exists validated_by uuid references profiles(id);
alter table catches add column if not exists validated_at timestamptz;
alter table catches add column if not exists rejection_reason text;
alter table catches add column if not exists time_override_approved boolean default false;
alter table catches add column if not exists time_override_by uuid references profiles(id);

-- Indexes for performance
create index if not exists idx_catches_validation_status 
  on catches(validation_status);
  
create index if not exists idx_catches_session_validation 
  on catches(session_id, validation_status);

-- Comments for clarity
comment on column catches.validation_status is 
  'pending = awaiting organizer approval, approved = counts on leaderboard, rejected = hidden';
comment on column catches.validated_by is 
  'User ID of organizer who approved/rejected this catch';
comment on column catches.rejection_reason is 
  'Reason provided by organizer when rejecting a catch';
comment on column catches.time_override_approved is 
  'Whether organizer has approved a catch logged outside competition time';
