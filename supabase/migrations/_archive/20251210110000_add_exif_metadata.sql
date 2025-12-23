-- Add EXIF metadata columns to catches table for photo verification
-- Stores GPS coordinates, timestamp, and camera info from photo EXIF data

alter table public.catches
  add column if not exists photo_exif_latitude double precision,
  add column if not exists photo_exif_longitude double precision,
  add column if not exists photo_exif_timestamp timestamptz,
  add column if not exists photo_camera_make text,
  add column if not exists photo_camera_model text;

-- Add comments for documentation
comment on column public.catches.photo_exif_latitude is 'GPS latitude from photo EXIF data (for verification)';
comment on column public.catches.photo_exif_longitude is 'GPS longitude from photo EXIF data (for verification)';
comment on column public.catches.photo_exif_timestamp is 'Original photo timestamp from EXIF data (for verification)';
comment on column public.catches.photo_camera_make is 'Camera manufacturer from EXIF (e.g. Apple, Samsung)';
comment on column public.catches.photo_camera_model is 'Camera model from EXIF (e.g. iPhone 15 Pro)';

-- Create index for potential verification queries
create index if not exists idx_catches_exif_location on public.catches(photo_exif_latitude, photo_exif_longitude) where photo_exif_latitude is not null;
