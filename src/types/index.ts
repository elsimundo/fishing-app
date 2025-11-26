export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export type Catch = {
  id: string
  user_id: string
  species: string
  weight_kg: number | null
  length_cm: number | null
  caught_at: string
  location_name: string
  latitude: number
  longitude: number
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

export type AuthUser = {
  id: string
  email: string | null
}

export type ApiError = {
  message: string
}
