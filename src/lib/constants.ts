export const APP_NAME = 'Sea Fishing App' as const

export const DEFAULT_MAP_CENTER = {
  lat: 54.5,
  lng: -3.5,
} as const

export const DEFAULT_MAP_ZOOM = 5 as const

export const FISH_SPECIES = {
  SALTWATER: [
    'Bass (Sea)',
    'Cod',
    'Mackerel',
    'Pollock',
    'Coalfish',
    'Wrasse (Ballan)',
    'Wrasse (Corkwing)',
    'Plaice',
    'Flounder',
    'Sole',
    'Dab',
    'Turbot',
    'Brill',
    'Dogfish (Lesser Spotted)',
    'Dogfish (Greater Spotted)',
    'Smoothhound',
    'Tope',
    'Rays (Thornback)',
    'Rays (Blonde)',
    'Rays (Small-eyed)',
    'Conger Eel',
    'Mullet (Thick-lipped)',
    'Mullet (Thin-lipped)',
    'Garfish',
    'Scad (Horse Mackerel)',
    'Black Bream',
    'Red Bream',
    'Gurnard (Red)',
    'Gurnard (Grey)',
    'Whiting',
    'Pouting',
    'Rockling',
    'Ling',
    'Haddock',
    'Hake',
    'Trigger Fish',
    'John Dory',
    'Sea Trout',
  ],

  COARSE: [
    'Carp (Common)',
    'Carp (Mirror)',
    'Carp (Leather)',
    'Carp (Ghost)',
    'Carp (Koi)',
    'Crucian Carp',
    'F1 Carp',
    'Pike',
    'Zander',
    'Perch',
    'Roach',
    'Rudd',
    'Bream (Common)',
    'Bream (Silver)',
    'Tench',
    'Barbel',
    'Chub',
    'Dace',
    'Bleak',
    'Gudgeon',
    'Ruffe',
    'Minnow',
    'Eel',
    'Catfish (Wels)',
    'Asp',
  ],

  GAME: [
    'Trout (Brown)',
    'Trout (Rainbow)',
    'Salmon (Atlantic)',
    'Grayling',
    'Char (Arctic)',
  ],
} as const

export const WATER_TYPES = [
  'Sea/Coastal',
  'River',
  'Lake/Reservoir',
  'Canal',
  'Pond',
  'Other',
] as const

export const LOCATION_PRIVACY_OPTIONS = [
  { value: 'private', label: 'Private (hidden)', description: 'Only you can see location' },
  { value: 'general', label: 'General area', description: 'Pin offset by ~5km' },
  { value: 'exact', label: 'Exact location', description: 'Full GPS (friends only)' },
] as const

export const TIDE_STATES = ['High', 'Low', 'Rising', 'Falling', 'Unknown'] as const

export const BAIT_SUGGESTIONS: Record<string, string[]> = {
  'Bass (Sea)': ['Lugworm', 'Ragworm', 'Sandeels', 'Mackerel strip', 'Squid', 'Peeler crab'],
  Mackerel: ['Feathers', 'Spinners', 'Strip', 'Sabiki rig'],
  Cod: ['Lugworm', 'Squid', 'Peeler crab', 'Razorfish'],
  Plaice: ['Lugworm', 'Ragworm', 'Razorfish'],
  'Rays (Thornback)': ['Mackerel', 'Squid', 'Sandeel', 'Herring'],

  'Carp (Common)': ['Boilies', 'Pellets', 'Corn', 'Tiger nuts', 'Bread', 'Hemp'],
  'Carp (Mirror)': ['Boilies', 'Pellets', 'Corn', 'Tiger nuts', 'Bread', 'Hemp'],
  Pike: ['Dead bait (mackerel)', 'Dead bait (roach)', 'Spoons', 'Spinners', 'Jerkbaits'],
  Perch: ['Worms', 'Maggots', 'Small lures', 'Drop shot'],
  Roach: ['Maggots', 'Casters', 'Bread', 'Hempseed'],
  Tench: ['Sweetcorn', 'Worms', 'Maggots', 'Pellets'],
  Barbel: ['Luncheon meat', 'Pellets', 'Boilies', 'Hemp'],

  'Trout (Brown)': ['Flies (dry)', 'Flies (wet)', 'Nymphs', 'Streamers', 'Worms'],
  'Trout (Rainbow)': ['Flies', 'Lures', 'Worms', 'Powerbait'],
  'Salmon (Atlantic)': ['Flies', 'Spinners', 'Prawns'],
}

export const RIG_SUGGESTIONS: Record<string, string[]> = {
  'Bass (Sea)': ['Running ledger', 'Paternoster', 'Float rig', 'Pulley rig'],
  Mackerel: ['Feather rig', 'Sabiki rig', 'Float rig'],
  'Rays (Thornback)': ['Pulley rig', 'Clipped down rig', 'Running ledger'],

  'Carp (Common)': ['Hair rig', 'Method feeder', 'Chod rig', 'Ronnie rig'],
  Pike: ['Wire trace', 'Float-fished deadbait', 'Leger deadbait'],
  Perch: ['Drop shot', 'Jig head', 'Float rig'],

  'Trout (Brown)': ['Fly line', 'Spinner rig', 'Float rig'],
}
