-- Add Weever species to species_info

INSERT INTO species_info (
  name,
  display_name,
  common_names,
  water_type,
  family,
  uk_regions,
  habitat,
  peak_months,
  year_round,
  typical_weight_lb,
  specimen_weight_lb,
  uk_record_lb,
  rarity,
  difficulty,
  emoji,
  description
)
VALUES
(
  'greater_weever',
  'Weever (Greater)',
  ARRAY['Greater Weever', 'Weever Fish', 'Weever'],
  'saltwater',
  'Trachinidae',
  ARRAY['Nationwide'],
  'Sandy beaches and shallow sandy ground, often in the surf zone.',
  ARRAY[5,6,7,8,9],
  false,
  0.2,
  0.6,
  NULL,
  'common',
  'easy',
  '⚠️',
  'A small, venomous fish that buries in sand. Handle with care due to painful dorsal and gill-cover spines.'
),
(
  'lesser_weever',
  'Weever (Lesser)',
  ARRAY['Lesser Weever', 'Weever Fish', 'Weever'],
  'saltwater',
  'Trachinidae',
  ARRAY['Nationwide'],
  'Very shallow sandy bays and beaches, sometimes right at the waterline.',
  ARRAY[5,6,7,8,9],
  false,
  0.1,
  0.3,
  NULL,
  'common',
  'easy',
  '⚠️',
  'A small, venomous fish commonly found in shallow sandy areas. Handle carefully due to spines.'
)
ON CONFLICT (name) DO NOTHING;
