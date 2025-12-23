-- Add species_id, region, and returned columns to catches table
-- This enables legal size checks and tracking of returned fish

alter table public.catches
  add column if not exists species_id text,
  add column if not exists region text default 'uk_england',
  add column if not exists returned boolean default false;

-- Add index for efficient species lookups
create index if not exists idx_catches_species_id on public.catches(species_id);

-- Add comments for documentation
comment on column public.catches.species_id is 'Species identifier from central species catalog';
comment on column public.catches.region is 'Region code for legal size rules';
comment on column public.catches.returned is 'Whether fish was returned (typically undersized)';
