export type FishingPreference = 'sea' | 'freshwater' | 'both'

export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  email?: string | null
  bio?: string | null
  cover_photo_url?: string | null
  location?: string | null
  fishing_preference?: FishingPreference | null
  is_private?: boolean
  default_latitude?: number | null
  default_longitude?: number | null
  share_data_for_insights?: boolean
  created_at: string
}

export type WaterType = 'Sea/Coastal' | 'River' | 'Lake/Reservoir' | 'Canal' | 'Pond' | 'Other'

export type LocationPrivacy = 'private' | 'general' | 'exact'

export type TideState = 'High' | 'Low' | 'Rising' | 'Falling' | 'Unknown'

export type ParticipantRole = 'owner' | 'contributor' | 'viewer'

export type ParticipantStatus = 'pending' | 'active' | 'left' | 'removed'

export interface SessionParticipant {
  id: string
  session_id: string
  user_id: string
  role?: ParticipantRole
  status?: ParticipantStatus
  invited_at?: string
  joined_at?: string | null
  left_at?: string | null

  // Per-angler spot context (where this participant is fishing)
  spot_name?: string | null
  mark_id?: string | null
  latitude?: number | null
  longitude?: number | null
  water_type?: string | null
  location_privacy?: LocationPrivacy | null

  created_at?: string
  updated_at?: string

  // Relations
  user?: Profile
  mark?: SavedMark
}

export type Session = {
  id: string
  user_id: string
  title: string | null
  location_name: string
  latitude: number
  longitude: number
  water_type: WaterType | null
  is_public: boolean
  location_privacy: LocationPrivacy
  started_at: string
  ended_at: string | null
  paused_at: string | null
  session_notes: string | null
  cover_photo_url: string | null
  weather_temp: number | null
  weather_condition: string | null
  wind_speed: number | null
  tide_state: TideState | null
  moon_phase: string | null
  created_at: string
  updated_at: string

  // When this session is the backing session for a competition
  competition_id?: string | null

  // Link to a fishing venue (lake/pond/reservoir)
  lake_id?: string | null
  lake?: Lake

  // Link to a saved mark (fishing spot)
  mark_id?: string | null
  mark?: SavedMark

  // Collaborative sessions (optional, when joined via richer queries)
  participants?: SessionParticipant[]
  participant_count?: number
  my_role?: ParticipantRole

  // Post/comment settings
  allow_posts?: boolean
  allow_comments?: boolean
}

export type Catch = {
  id: string
  user_id: string
  session_id: string | null
  species: string
  weight_kg: number | null
  length_cm: number | null
  caught_at: string
  location_name: string | null
  latitude: number | null
  longitude: number | null
  bait: string | null
  rig: string | null
  fishing_style: string | null
  photo_url: string | null
  notes: string | null
  weather_temp: number | null
  weather_condition: string | null
  wind_speed: number | null
  moon_phase: string | null
  released?: boolean | null
  created_at: string
  updated_at: string

  // Legal size tracking
  species_id?: string | null
  region?: string | null
  returned?: boolean

  // EXIF metadata from photo (for verification)
  photo_exif_latitude?: number | null
  photo_exif_longitude?: number | null
  photo_exif_timestamp?: string | null
  photo_camera_make?: string | null
  photo_camera_model?: string | null

  // Link to a saved mark (fishing spot) - can differ from session mark if angler moved
  mark_id?: string | null
  mark?: SavedMark

  // Optional relation for attribution
  logged_by?: Profile
}

export type SessionStats = {
  total_catches: number
  total_weight_kg: number
  biggest_catch: Catch | null
  species_breakdown: Record<string, number>
  duration_hours: number
}

export type SessionWithCatches = Session & {
  catches: Catch[]
  stats: SessionStats
}

export type SessionFormData = {
  title?: string
  location_name: string
  latitude: number
  longitude: number
  water_type?: WaterType
  is_public: boolean
  location_privacy: LocationPrivacy
  started_at: string
  ended_at?: string
  session_notes?: string
  cover_photo_url?: string
  tide_state?: TideState
  weather_temp?: number | null
  weather_condition?: string | null
  wind_speed?: number | null
  moon_phase?: string | null
}

export type AuthUser = {
  id: string
  email: string | null
}

export type ApiError = {
  message: string
}

export type CatchFormInput = {
  species: string
  caught_at: string
  location_name: string
  latitude: number
  longitude: number
  weight_kg?: number | null
  length_cm?: number | null
  bait?: string | null
  rig?: string | null
  fishing_style?: string | null
  photo_url?: string | null
  notes?: string | null
}

export type SessionShare = {
  id: string
  session_id: string
  shared_with_user_id: string
  owner_id: string
  can_view_exact_location: boolean
  created_at: string
}

// ============================================================================
// Social Features Types
// ============================================================================

export interface Post {
  id: string
  user_id: string
  type: 'session' | 'catch' | 'photo' | 'badge'
  session_id?: string
  catch_id?: string
  caption?: string
  photo_url?: string
  location_privacy?: LocationPrivacy
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface PostLike {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface PostComment {
  id: string
  post_id: string
  user_id: string
  text: string
  created_at: string
  updated_at: string
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface Business {
  id: string
  name: string
  type: 'tackle_shop' | 'fishing_club' | 'charter_boat'
  latitude: number
  longitude: number
  address?: string
  postcode?: string
  phone?: string
  email?: string
  website?: string
  description?: string
  hours?: Record<string, string>
  verified: boolean
  claimed_by_owner?: string
  created_at: string
  updated_at: string
}

export type LakeWaterType = 'lake' | 'pond' | 'reservoir' | 'river' | 'canal' | 'other'
export type LakeType = 'commercial' | 'syndicate' | 'club' | 'day_ticket' | 'public' | 'private'

export interface Lake {
  id: string
  name: string
  slug?: string
  description?: string
  
  // Location
  latitude: number
  longitude: number
  address?: string
  postcode?: string
  region?: string
  
  // Venue details
  water_type?: LakeWaterType
  lake_type?: LakeType
  size_acres?: number
  max_depth_m?: number
  species?: string[]
  
  // Fishing rules
  barbless_only?: boolean
  catch_and_release_only?: boolean
  max_rods?: number
  rules?: string
  
  // Facilities
  has_parking?: boolean
  has_toilets?: boolean
  has_cafe?: boolean
  has_tackle_shop?: boolean
  is_night_fishing_allowed?: boolean
  is_disabled_accessible?: boolean
  
  // Contact
  phone?: string
  email?: string
  website?: string
  booking_url?: string
  
  // Pricing
  day_ticket_price?: number
  night_ticket_price?: number
  season_ticket_price?: number
  
  // Images
  cover_image_url?: string
  images?: string[]
  
  // Ownership
  claimed_by?: string
  claimed_at?: string
  is_verified?: boolean
  is_premium?: boolean
  is_founding_venue?: boolean
  premium_expires_at?: string
  
  // Stats (auto-updated by triggers)
  total_sessions?: number
  total_catches?: number
  last_session_at?: string
  
  // Metadata
  created_at: string
  updated_at: string
  
  // Computed (for UI)
  distance?: number
}

// ============================================================================
// Enriched Types for UI
// ============================================================================

export interface PostWithUser extends Post {
  user: {
    id: string
    username: string
    full_name: string
    avatar_url?: string | null
  }
  session?: Session
  catch?: Catch
  like_count: number
  comment_count: number
  is_liked_by_user: boolean
}

export interface ProfileWithCounts extends Profile {
  follower_count: number
  following_count: number
  post_count: number
}

// ============================================================================
// Competitions Types
// ============================================================================

export type CompetitionType = 'heaviest_fish' | 'most_catches' | 'species_diversity' | 'photo_contest'

// Award categories for competitions (can have multiple per competition)
export type AwardCategory = 
  | 'heaviest_total'      // Sum of all catch weights
  | 'biggest_single'      // Largest individual fish by weight
  | 'longest_fish'        // Longest individual fish
  | 'most_catches'        // Total number of fish caught
  | 'species_diversity'   // Most different species
  | 'photo_contest'       // Best photo (judged)

export interface CompetitionAward {
  id: string
  competition_id: string
  category: AwardCategory
  title: string
  prize: string | null
  position: number
  target_species: string | null  // Optional: specific species this award targets (e.g., "Smoothhound", "Cod")
  created_at: string
}

export type CompetitionStatus = 'upcoming' | 'active' | 'ended' | 'cancelled'

export type CompetitionInviteStatus = 'pending' | 'accepted' | 'declined'

export interface CompetitionLocationRestriction {
  lat: number
  lng: number
  radius_km: number
}

export interface Competition {
  id: string
  created_by: string
  // Linked live session for this competition (may be null for legacy rows)
  session_id?: string | null
  title: string
  description: string | null
  type: CompetitionType
  allowed_species: string[] | null
  // Note: this water_type is competition-specific, not the main Session WaterType
  water_type: 'saltwater' | 'freshwater' | 'any' | null
  location_restriction: CompetitionLocationRestriction | null
  starts_at: string
  ends_at: string
  entry_fee: number
  prize: string | null
  max_participants: number | null
  is_public: boolean
  invite_only: boolean
  status: CompetitionStatus
  winner_id: string | null
  cover_image_url: string | null
  created_at: string
  updated_at: string

  // Optional relations/enriched fields
  creator?: Profile
  winner?: Profile
  participant_count?: number
  entry_count?: number
  // Derived stats when using the new session-based model
  catch_count?: number
  my_rank?: number
}

export interface CompetitionLeaderboardEntry {
  rank: number
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  score: number
  catch_count: number
  best_catch_id: string | null
  best_catch_species: string | null
  best_catch_weight: number | null
  best_catch_length: number | null
  best_catch_photo: string | null
}

export interface CompetitionEntry {
  id: string
  competition_id: string
  user_id: string
  session_id: string
  submitted_at: string
  score: number | null
  rank: number | null
  is_valid: boolean
  notes: string | null
  created_at: string

  // Optional relations
  competition?: Competition
  user?: Profile
  session?: Session
}

export interface CompetitionInvite {
  id: string
  competition_id: string
  inviter_id: string
  invitee_id: string
  status: CompetitionInviteStatus
  created_at: string
  responded_at: string | null

  // Optional relations
  competition?: Competition
  inviter?: Profile
  invitee?: Profile
}

// ============================================================================
// Lake Claims Types
// ============================================================================

export type LakeClaimRole = 'owner' | 'manager' | 'staff' | 'committee' | 'other'

export type LakeClaimProofType = 
  | 'insurance'
  | 'lease'
  | 'utility_bill'
  | 'companies_house'
  | 'club_membership'
  | 'website_admin'
  | 'other'

export type LakeClaimStatus = 'pending' | 'approved' | 'rejected'

export interface LakeClaimDetails {
  water_type?: LakeWaterType
  lake_type?: LakeType
  day_ticket_price?: number
  night_ticket_price?: number
  facilities?: string[]
  description?: string
  species?: string[]
}

export interface LakeClaim {
  id: string
  lake_id: string
  user_id: string
  status: LakeClaimStatus
  
  // Claimant info
  role: LakeClaimRole
  business_name?: string
  website?: string
  phone?: string
  email?: string
  
  // Proof of ownership
  proof_url?: string
  proof_type?: LakeClaimProofType
  
  // Venue details they're submitting
  lake_details?: LakeClaimDetails
  
  // Legacy field (kept for backwards compat)
  message?: string
  
  // Commercial interest
  interested_in_premium: boolean
  terms_accepted: boolean
  
  // Review info
  reviewed_at?: string
  reviewed_by?: string
  rejection_reason?: string
  
  created_at: string
  
  // Optional relations
  lake?: Lake
  user?: Profile
}

// Saved Marks / Watchlist
export type SavedMarkWaterType = 'sea' | 'coastal' | 'river' | 'lake' | 'canal' | 'pond' | 'reservoir' | 'other'
export type MarkPrivacyLevel = 'private' | 'friends' | 'public'

export interface SavedMark {
  id: string
  user_id: string
  name: string
  latitude: number
  longitude: number
  water_type: SavedMarkWaterType
  notes?: string | null
  privacy_level: MarkPrivacyLevel
  created_at: string
  updated_at: string
  
  // Optional: populated when fetching with shares
  shares?: MarkShare[]
  shared_by_user?: Profile // When this mark was shared with you
  owner?: Profile // The mark owner
}

export interface MarkShare {
  id: string
  mark_id: string
  shared_by: string
  shared_with: string
  can_edit: boolean
  created_at: string
  
  // Optional relations
  shared_by_user?: Profile
  shared_with_user?: Profile
}
