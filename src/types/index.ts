export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  email?: string | null
  created_at: string
}

export type WaterType = 'Sea/Coastal' | 'River' | 'Lake/Reservoir' | 'Canal' | 'Pond' | 'Other'

export type LocationPrivacy = 'private' | 'general' | 'exact'

export type TideState = 'High' | 'Low' | 'Rising' | 'Falling' | 'Unknown'

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
  created_at: string
  updated_at: string
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
  created_at: string
  updated_at: string
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
