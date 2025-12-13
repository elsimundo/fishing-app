import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useActiveSession } from '../../hooks/useActiveSession'
import { useSessionParticipant } from '../../hooks/useSessionParticipant'
import type { Catch, CatchFormInput } from '../../types'
import { LocationPicker } from '../map/LocationPicker'
import { uploadCatchPhoto } from '../../hooks/usePhotoUpload'
import { FISH_SPECIES, getSpeciesByCategory } from '../../lib/constants'
import { useFreshwaterEnabled } from '../../hooks/useFeatureFlags'
import { getOrCreateSessionForCatch } from '../../lib/autoSession'
import { useCatchXP } from '../../hooks/useCatchXP'
import { Globe, Lock, Info } from 'lucide-react'
import { getCompleteWeatherData } from '../../services/open-meteo'
import { WEATHER_CODES } from '../../types/weather'
import { getMoonPhase } from '../../utils/moonPhase'
import { SmartCatchPhoto } from './SmartCatchPhoto'
import type { FishIdentificationResult } from '../../types/fish'
import { SPECIES } from '../../types/species'
import { getLegalSizeStatus } from '../../lib/legalSizes'
import type { RegionCode } from '../../types/species'
import type { PhotoMetadata } from '../../utils/exifExtractor'
import { getCountryFromCoords } from '../../utils/reverseGeocode'
import { useSavedMarks } from '../../hooks/useSavedMarks'

const fishingStyles = [
  'Shore fishing',
  'Boat fishing',
  'Rock fishing',
  'Pier fishing',
  'Kayak fishing',
  'Lure fishing',
  'Fly fishing',
] as const

const catchFormSchema = z.object({
  species: z.string().min(1, 'Species is required'),
  caught_at: z.string().min(1, 'Date/time is required'),
  location_name: z.string().min(1, 'Location name is required'),
  latitude: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => !Number.isNaN(val), { message: 'Latitude must be a number' }),
  longitude: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => !Number.isNaN(val), { message: 'Longitude must be a number' }),
  weight_kg: z
    .string()
    .optional()
    .transform((val) => (val === undefined || val === '' ? null : Number(val)))
    .refine((val) => val === null || (!Number.isNaN(val) && val > 0), {
      message: 'Weight must be a positive number',
    })
    .nullable(),
  length_cm: z
    .string()
    .optional()
    .transform((val) => (val === undefined || val === '' ? null : Number(val)))
    .refine((val) => val === null || (!Number.isNaN(val) && val > 0), {
      message: 'Length must be a positive number',
    })
    .nullable(),
  bait: z.string().optional().transform((val) => (val === '' ? null : val)),
  rig: z.string().optional().transform((val) => (val === '' ? null : val)),
  fishing_style: z.string().optional().transform((val) => (val === '' ? null : val)),
  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or less')
    .optional()
    .transform((val) => (val === '' ? null : val)),
})

type CatchFormValues = z.infer<typeof catchFormSchema>

type CatchFormProps = {
  onSuccess: () => void
  mode?: 'create' | 'edit'
  catchId?: string
  initialCatch?: Catch
  // Pre-filled data from Fish Identifier
  prefilledAiResult?: FishIdentificationResult
  prefilledPhotoFile?: File
  prefilledMetadata?: PhotoMetadata
}

function normaliseSpeciesName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function mapAiSpeciesToOption(aiSpecies: string): string {
  if (!aiSpecies) return ''

  const aiNorm = normaliseSpeciesName(aiSpecies)

  // Common manual mappings for UK species
  const manualMap: Record<string, string> = {
    'atlantic mackerel': 'Mackerel',
    mackerel: 'Mackerel',
    'european seabass': 'Bass (Sea)',
    'european sea bass': 'Bass (Sea)',
    'sea bass': 'Bass (Sea)',
    seabass: 'Bass (Sea)',
    'atlantic salmon': 'Salmon (Atlantic)',
    'brown trout': 'Trout (Brown)',
    'rainbow trout': 'Trout (Rainbow)',
  }

  if (manualMap[aiNorm]) {
    return manualMap[aiNorm]
  }

  const allOptions = [
    ...FISH_SPECIES.SALTWATER,
    ...FISH_SPECIES.COARSE,
    ...FISH_SPECIES.GAME,
  ]

  // 1) Exact (case-insensitive) match
  const exact = allOptions.find((opt) => opt.toLowerCase() === aiSpecies.toLowerCase())
  if (exact) return exact

  // 2) Normalised match ignoring qualifiers like (Sea)
  const exactNorm = allOptions.find((opt) => normaliseSpeciesName(opt) === aiNorm)
  if (exactNorm) return exactNorm

  // 3) Contains match: AI name contains option base or vice versa
  const contains = allOptions.find((opt) => {
    const optNorm = normaliseSpeciesName(opt)
    return aiNorm.includes(optNorm) || optNorm.includes(aiNorm)
  })
  if (contains) return contains

  // 4) Fallback: use raw AI species label
  return aiSpecies
}

function mapAiResultToDisplayName(result: FishIdentificationResult): string {
  const aiSpecies = result.species || ''
  const aiScientific = result.scientificName || ''

  const sciNorm = aiScientific.trim().toLowerCase()

  if (sciNorm) {
    const sciMatch = SPECIES.find(
      (s) => s.scientificName.trim().toLowerCase() === sciNorm,
    )
    if (sciMatch) return sciMatch.displayName
  }

  const mapped = mapAiSpeciesToOption(aiSpecies)
  return mapped || aiSpecies
}

export function CatchForm({ 
  onSuccess, 
  mode = 'create', 
  catchId, 
  initialCatch,
  prefilledAiResult,
  prefilledPhotoFile,
  prefilledMetadata,
}: CatchFormProps) {
  const { user } = useAuth()
  const { data: activeSession } = useActiveSession()
  const catchXP = useCatchXP()
  const freshwaterEnabled = useFreshwaterEnabled()
  
  // Get species categories based on freshwater feature flag
  const speciesCategories = getSpeciesByCategory(freshwaterEnabled)
  
  // Check if a specific session is requested via URL parameter
  const searchParams = new URLSearchParams(window.location.search)
  const requestedSessionId = searchParams.get('session')
  
  // Use requested session if provided, otherwise fall back to active session
  const targetSessionId = requestedSessionId || activeSession?.id
  
  // Fetch participant's spot for this session (per-angler location context)
  const { data: participantSpot } = useSessionParticipant(targetSessionId)
  
  // Fetch saved marks for quick location selection
  const { marks: savedMarks } = useSavedMarks()
  
  // Debug logging
  console.log('CatchForm - URL params:', window.location.search)
  console.log('CatchForm - requestedSessionId:', requestedSessionId)
  console.log('CatchForm - activeSession?.id:', activeSession?.id)
  console.log('CatchForm - targetSessionId:', targetSessionId)
  console.log('CatchForm - participantSpot:', participantSpot)
  const [formError, setFormError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(prefilledPhotoFile || null)
  const [isPublic, setIsPublic] = useState(true)
  const [hideExactLocation, setHideExactLocation] = useState(false)
  
  // Legal size tracking
  const [speciesId, setSpeciesId] = useState<string | null>(null)
  const [returned, setReturned] = useState(false)
  const REGION_FOR_RULES: RegionCode = 'uk_england'
  
  // EXIF metadata from photo
  const [photoMetadata, setPhotoMetadata] = useState<PhotoMetadata | null>(prefilledMetadata || null)

  const defaultNow = new Date().toISOString().slice(0, 16)

  const defaultValues: Partial<CatchFormValues> = initialCatch
    ? {
        species: initialCatch.species,
        caught_at: new Date(initialCatch.caught_at).toISOString().slice(0, 16),
        location_name: initialCatch.location_name ?? undefined,
        latitude:
          initialCatch.latitude != null && !Number.isNaN(initialCatch.latitude)
            ? initialCatch.latitude.toString()
            : undefined,
        longitude:
          initialCatch.longitude != null && !Number.isNaN(initialCatch.longitude)
            ? initialCatch.longitude.toString()
            : undefined,
        weight_kg: initialCatch.weight_kg != null ? initialCatch.weight_kg.toString() : undefined,
        length_cm: initialCatch.length_cm != null ? initialCatch.length_cm.toString() : undefined,
        bait: initialCatch.bait ?? undefined,
        rig: initialCatch.rig ?? undefined,
        fishing_style: initialCatch.fishing_style ?? undefined,
        notes: initialCatch.notes ?? undefined,
      }
    : {
        caught_at: defaultNow,
        // When creating a brand new catch, prefill from participant spot first, then session
        location_name: participantSpot?.spot_name ?? activeSession?.location_name ?? undefined,
        latitude:
          (participantSpot?.latitude != null && !Number.isNaN(participantSpot.latitude))
            ? participantSpot.latitude.toString()
            : (activeSession?.latitude != null && !Number.isNaN(activeSession.latitude))
              ? activeSession.latitude.toString()
              : undefined,
        longitude:
          (participantSpot?.longitude != null && !Number.isNaN(participantSpot.longitude))
            ? participantSpot.longitude.toString()
            : (activeSession?.longitude != null && !Number.isNaN(activeSession.longitude))
              ? activeSession.longitude.toString()
              : undefined,
      }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CatchFormValues>({
    resolver: zodResolver(catchFormSchema),
    defaultValues,
  })

  const watchedLat = watch('latitude')
  const watchedLng = watch('longitude')
  const watchedSpecies = watch('species')
  const watchedLength = watch('length_cm')

  const latNumber =
    watchedLat === undefined || watchedLat === null || watchedLat === ''
      ? null
      : Number(watchedLat)

  const lngNumber =
    watchedLng === undefined || watchedLng === null || watchedLng === ''
      ? null
      : Number(watchedLng)

  const pickerValue = {
    lat: Number.isNaN(latNumber ?? NaN) ? null : latNumber,
    lng: Number.isNaN(lngNumber ?? NaN) ? null : lngNumber,
  }

  // Track species changes to update speciesId
  useEffect(() => {
    const species = SPECIES.find((s) => s.displayName === watchedSpecies)
    setSpeciesId(species?.id ?? null)
  }, [watchedSpecies])

  // Handle prefilled data from Fish Identifier
  useEffect(() => {
    if (prefilledAiResult) {
      const speciesValue = mapAiResultToDisplayName(prefilledAiResult) || ''
      setValue('species', speciesValue, { shouldValidate: true })
      
      const species = SPECIES.find((s) => s.displayName === speciesValue)
      setSpeciesId(species?.id ?? null)
    }

    if (prefilledMetadata) {
      // Auto-fill GPS location if available
      if (prefilledMetadata.hasGPS && prefilledMetadata.latitude && prefilledMetadata.longitude) {
        setValue('latitude', prefilledMetadata.latitude.toString(), { shouldValidate: true })
        setValue('longitude', prefilledMetadata.longitude.toString(), { shouldValidate: true })
      }
      
      // Auto-fill timestamp if available
      if (prefilledMetadata.hasTimestamp && prefilledMetadata.timestamp) {
        const localDateTime = new Date(prefilledMetadata.timestamp).toISOString().slice(0, 16)
        setValue('caught_at', localDateTime, { shouldValidate: true })
      }
    }
  }, [prefilledAiResult, prefilledMetadata, setValue])

  // Compute legal size status
  const lengthNumber = watchedLength && watchedLength !== '' ? Number(watchedLength) : null
  const legalStatus = getLegalSizeStatus({
    speciesId,
    region: REGION_FOR_RULES,
    lengthCm: lengthNumber,
  })

  const onSubmit = async (values: CatchFormValues) => {
    if (!user) {
      setFormError('You must be logged in to add a catch.')
      toast.error('You must be logged in to add a catch.')
      return
    }

    setFormError(null)

    let photoUrl: string | null = initialCatch?.photo_url ?? null

    if (photoFile) {
      try {
        const { url } = await uploadCatchPhoto({ file: photoFile, userId: user.id })
        photoUrl = url
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload photo.'
        setFormError(message)
        toast.error(message)
        return
      }
    }

    const caughtAtIso = new Date(values.caught_at).toISOString()
    
    // Determine session_id - use existing or auto-create one
    let sessionId: string | undefined = undefined
    if (mode === 'create' && !catchId) {
      if (targetSessionId) {
        // Use the target session (from URL or active session)
        sessionId = targetSessionId
      } else {
        // No active session - auto-create one based on catch location/time
        try {
          sessionId = await getOrCreateSessionForCatch({
            userId: user.id,
            latitude: typeof values.latitude === 'number' ? values.latitude : null,
            longitude: typeof values.longitude === 'number' ? values.longitude : null,
            locationName: values.location_name,
            caughtAt: caughtAtIso,
          })
          console.log('CatchForm - Auto-created/found session:', sessionId)
        } catch (err) {
          console.error('Failed to auto-create session:', err)
          // Continue without session if auto-creation fails
        }
      }
    }

    // Get mark_id and weather snapshot from the session if one exists
    let markId: string | null = null
    let weatherTemp: number | null = null
    let weatherCondition: string | null = null
    let windSpeed: number | null = null

    if (sessionId) {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('mark_id, weather_temp, weather_condition, wind_speed')
        .eq('id', sessionId)
        .single()
      markId = sessionData?.mark_id ?? null
      weatherTemp = sessionData?.weather_temp ?? null
      weatherCondition = sessionData?.weather_condition ?? null
      windSpeed = sessionData?.wind_speed ?? null
    }

    // If no session snapshot, fetch weather directly for this catch location
    if (weatherTemp === null && typeof values.latitude === 'number' && typeof values.longitude === 'number') {
      try {
        const weatherData = await getCompleteWeatherData(values.latitude, values.longitude).catch(() => null)
        if (weatherData?.current) {
          weatherTemp = weatherData.current.temperature
          windSpeed = weatherData.current.windSpeed
          const code = weatherData.current.weatherCode
          weatherCondition = WEATHER_CODES[code]?.description || null
        }
      } catch (e) {
        console.warn('[CatchForm] Failed to fetch weather snapshot:', e)
      }
    }

    const payload = {
      user_id: user.id,
      species: values.species,
      caught_at: caughtAtIso,
      location_name: values.location_name,
      latitude: values.latitude,
      longitude: values.longitude,
      weight_kg: values.weight_kg ?? null,
      length_cm: values.length_cm ?? null,
      bait: values.bait ?? null,
      rig: values.rig ?? null,
      fishing_style: values.fishing_style ?? null,
      photo_url: photoUrl,
      notes: values.notes ?? null,
      session_id: sessionId,
      mark_id: markId,
      is_public: isPublic,
      hide_exact_location: hideExactLocation,
      weather_temp: weatherTemp,
      weather_condition: weatherCondition,
      wind_speed: windSpeed,
      moon_phase: getMoonPhase().phase,
      species_id: speciesId,
      region: REGION_FOR_RULES,
      returned: returned,
      // EXIF metadata for verification
      photo_exif_latitude: photoMetadata?.latitude ?? null,
      photo_exif_longitude: photoMetadata?.longitude ?? null,
      photo_exif_timestamp: photoMetadata?.timestamp ?? null,
      photo_camera_make: photoMetadata?.cameraMake ?? null,
      photo_camera_model: photoMetadata?.cameraModel ?? null,
      // Country code for geographic challenges (will be set below)
      country_code: null as string | null,
    }

    // Detect country from coordinates
    if (values.latitude && values.longitude) {
      try {
        payload.country_code = await getCountryFromCoords(values.latitude, values.longitude)
      } catch (err) {
        console.warn('Failed to detect country:', err)
      }
    }

    console.log('CatchForm - Submitting payload with session_id:', payload.session_id)
    console.log('CatchForm - Full payload:', payload)

    const isEdit = mode === 'edit' && catchId

    const { data, error } = isEdit
      ? await supabase.from('catches').update(payload).eq('id', catchId).select().single()
      : await supabase.from('catches').insert(payload).select().single()

    if (error) {
      setFormError(error.message)
      toast.error(error.message)
      return
    }

    // Award XP for new catches (not edits)
    if (!isEdit && data) {
      catchXP.mutate({
        catchId: data.id,
        species: data.species,
        weightKg: data.weight_kg,
        weightLb: data.weight_kg ? data.weight_kg * 2.205 : null,
        sessionId: data.session_id,
        hasPhoto: !!data.photo_url,
        caughtAt: data.caught_at,
        latitude: data.latitude,
        longitude: data.longitude,
        // Environmental data for condition-based challenges
        weatherCondition: data.weather_condition,
        windSpeed: data.wind_speed,
        moonPhase: data.moon_phase,
        // Country code for geographic challenges
        countryCode: payload.country_code,
      })

      // Auto-post to feed if catch is public and user has a public profile
      if (isPublic) {
        try {
          // Check if user's profile is public
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_private')
            .eq('id', user.id)
            .single()

          if (profile && !profile.is_private) {
            // Create a post for this catch
            await supabase.from('posts').insert({
              user_id: user.id,
              type: 'catch',
              catch_id: data.id,
              caption: null, // User can edit caption later if they want
              photo_url: data.photo_url,
              is_public: true,
            })
            console.log('Auto-posted catch to feed')
          }
        } catch (postErr) {
          // Don't fail the catch creation if auto-post fails
          console.warn('Failed to auto-post catch to feed:', postErr)
        }
      }
    } else {
      toast.success(isEdit ? 'Catch updated' : 'Catch added')
    }
    
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {formError ? (
        <div className="rounded-md bg-red-900/30 border border-red-500/40 px-3 py-2 text-xs text-red-400">
          {formError}
        </div>
      ) : null}

      {mode === 'create' && activeSession ? (
        <div className="rounded-md bg-emerald-900/30 border border-emerald-500/40 px-3 py-2 text-[11px] text-emerald-400">
          This catch will be added to your active session:{' '}
          <span className="font-semibold">{activeSession.title || activeSession.location_name}</span>.
          {participantSpot?.spot_name && (
            <span className="block mt-1">
              📍 Using your session spot: <span className="font-semibold">{participantSpot.spot_name}</span>
            </span>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SmartCatchPhoto
            initialPhotoFile={prefilledPhotoFile}
            initialMetadata={prefilledMetadata}
            onPhotoChange={(file: File | null) => {
              setPhotoFile(file)
              if (!file) {
                setPhotoMetadata(null)
              }
            }}
            onSpeciesIdentified={(result: FishIdentificationResult) => {
              console.log('[CatchForm] AI Result received:', result)
              const speciesValue = mapAiResultToDisplayName(result) || ''
              console.log('[CatchForm] Mapped to display name:', speciesValue)
              
              setValue('species', speciesValue, { shouldValidate: true })
              
              // Also set speciesId for legal size checks
              const species = SPECIES.find((s) => s.displayName === speciesValue)
              setSpeciesId(species?.id ?? null)
              console.log('[CatchForm] Found species ID:', species?.id)
              
              if (speciesValue) {
                toast.success(`Species set to ${speciesValue}`)
              }
            }}
            onMetadataExtracted={(metadata: PhotoMetadata) => {
              console.log('[CatchForm] EXIF metadata extracted:', metadata)
              setPhotoMetadata(metadata)
              
              // Auto-fill GPS location if available
              if (metadata.hasGPS && metadata.latitude && metadata.longitude) {
                setValue('latitude', metadata.latitude.toString(), { shouldValidate: true })
                setValue('longitude', metadata.longitude.toString(), { shouldValidate: true })
                toast.success('Location auto-filled from photo')
              }
              
              // Auto-fill timestamp if available
              if (metadata.hasTimestamp && metadata.timestamp) {
                const localDateTime = new Date(metadata.timestamp).toISOString().slice(0, 16)
                setValue('caught_at', localDateTime, { shouldValidate: true })
                toast.success('Date & time auto-filled from photo')
              }
            }}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-400" htmlFor="species">
            Species
          </label>
          <select
            id="species"
            className="block w-full rounded-md border border-[#334155] bg-[#1A2D3D] text-white px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('species')}
          >
            <option value="">Select species</option>
            <optgroup label="Saltwater">
              {speciesCategories.saltwater.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </optgroup>
            {speciesCategories.coarse.length > 0 && (
              <optgroup label="Coarse">
                {speciesCategories.coarse.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            )}
            {speciesCategories.game.length > 0 && (
              <optgroup label="Game">
                {speciesCategories.game.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            )}
            <option value="Other">Other / not listed</option>
          </select>
          {errors.species ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.species.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400" htmlFor="caught_at">
            Date & time
          </label>
          <input
            id="caught_at"
            type="datetime-local"
            className="block w-full rounded-md border border-[#334155] bg-[#1A2D3D] text-white px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('caught_at')}
          />
          {errors.caught_at ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.caught_at.message}</p>
          ) : null}
        </div>

        {/* Quick mark picker */}
        {savedMarks.length > 0 && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Use a saved mark (optional)
            </label>
            <select
              className="block w-full rounded-md border border-[#334155] bg-[#1A2D3D] text-white px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => {
                const markId = e.target.value
                if (!markId) return
                const mark = savedMarks.find((m) => m.id === markId)
                if (!mark) return
                setValue('location_name', mark.name, { shouldValidate: true })
                setValue('latitude', mark.latitude.toString(), { shouldValidate: true })
                setValue('longitude', mark.longitude.toString(), { shouldValidate: true })
              }}
              defaultValue=""
            >
              <option value="">Select a mark to auto-fill location...</option>
              {savedMarks.map((mark) => (
                <option key={mark.id} value={mark.id}>
                  {mark.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400" htmlFor="location_name">
            Location name
          </label>
          <input
            id="location_name"
            type="text"
            className="block w-full rounded-md border border-[#334155] bg-[#1A2D3D] text-white px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g. Chesil Beach, Dorset"
            {...register('location_name')}
          />
          {errors.location_name ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.location_name.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-400">Pick location on map</p>
            <button
              type="button"
              className="rounded-md border border-[#334155] bg-[#1A2D3D] text-white px-2 py-1 text-[11px] text-gray-400 hover:bg-[#334155]"
              onClick={() => {
                if (!navigator.geolocation) {
                  setFormError('Geolocation is not available in this browser.')
                  return
                }

                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const { latitude, longitude } = pos.coords
                    setValue('latitude', latitude.toString(), { shouldValidate: true })
                    setValue('longitude', longitude.toString(), { shouldValidate: true })
                  },
                  () => {
                    setFormError('Could not get your location. Please drag or tap on the map.')
                  },
                  { enableHighAccuracy: true, timeout: 10000 },
                )
              }}
            >
              Use my current location
            </button>
          </div>

          <LocationPicker
            value={pickerValue}
            onChange={({ lat, lng }) => {
              setValue('latitude', lat.toString(), { shouldValidate: true })
              setValue('longitude', lng.toString(), { shouldValidate: true })
            }}
          />
          <p className="mt-1 text-[11px] text-gray-500">
            Tap or drag the pin to your fishing spot. Coordinates are saved automatically.
          </p>
          {errors.latitude ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.latitude.message}</p>
          ) : null}
          {errors.longitude ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.longitude.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400" htmlFor="weight_kg">
            Weight (kg)
          </label>
          <input
            id="weight_kg"
            type="number"
            inputMode="decimal"
            step="0.01"
            className="block w-full rounded-md border border-[#334155] bg-[#1A2D3D] text-white px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('weight_kg')}
          />
          {errors.weight_kg ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.weight_kg.message as string}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400" htmlFor="length_cm">
            Length (cm)
          </label>
          <input
            id="length_cm"
            type="number"
            inputMode="decimal"
            step="0.1"
            className="block w-full rounded-md border border-[#334155] bg-[#1A2D3D] text-white px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('length_cm')}
          />
          {errors.length_cm ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.length_cm.message as string}</p>
          ) : null}
          
          {/* Legal size status */}
          {legalStatus.status === 'undersized' && legalStatus.rule?.minLengthCm ? (
            <div className="mt-2 space-y-2">
              <p className="text-[11px] text-red-600 font-medium">
                ⚠️ Undersized for this region (minimum {legalStatus.rule.minLengthCm} cm). Please return this fish.
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={returned}
                  onChange={(e) => setReturned(e.target.checked)}
                  className="h-4 w-4 rounded border-[#334155] bg-[#1A2D3D] text-white text-navy-800 focus:ring-navy-800"
                />
                <span className="text-xs text-gray-400">I returned this fish to the water</span>
              </label>
            </div>
          ) : legalStatus.status === 'legal' ? (
            <p className="mt-1 text-[11px] text-emerald-600">
              ✓ Meets suggested minimum size for this region
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400" htmlFor="bait">
            Bait
          </label>
          <input
            id="bait"
            type="text"
            placeholder="e.g. lugworm, ragworm, squid"
            className="block w-full rounded-md border border-[#334155] bg-[#1A2D3D] text-white px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('bait')}
          />
          {errors.bait ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.bait.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400" htmlFor="rig">
            Rig
          </label>
          <input
            id="rig"
            type="text"
            placeholder="e.g. running ledger, paternoster"
            className="block w-full rounded-md border border-[#334155] bg-[#1A2D3D] text-white px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('rig')}
          />
          {errors.rig ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.rig.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400" htmlFor="fishing_style">
            Fishing style
          </label>
          <select
            id="fishing_style"
            className="block w-full rounded-md border border-[#334155] bg-[#1A2D3D] text-white px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('fishing_style')}
          >
            <option value="">Select style</option>
            {fishingStyles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
          {errors.fishing_style ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.fishing_style.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-400" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            className="block w-full resize-none rounded-md border border-[#334155] bg-[#1A2D3D] text-white px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Conditions, tactics, who you were fishing with, etc."
            {...register('notes')}
          />
          {errors.notes ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.notes.message}</p>
          ) : null}
        </div>

        {/* Privacy Settings */}
        <div className="sm:col-span-2 space-y-3">
          <p className="text-xs font-medium text-gray-400">Sharing</p>
          
          {/* Public/Private Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                isPublic
                  ? 'border-[#1BA9A0] bg-[#1BA9A0]/20 text-[#1BA9A0]'
                  : 'border-[#334155] bg-[#1A2D3D] text-gray-400 hover:bg-[#334155]'
              }`}
            >
              <Globe size={14} />
              Public
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                !isPublic
                  ? 'border-[#1BA9A0] bg-[#1BA9A0]/20 text-[#1BA9A0]'
                  : 'border-[#334155] bg-[#1A2D3D] text-gray-400 hover:bg-[#334155]'
              }`}
            >
              <Lock size={14} />
              Private
            </button>
          </div>

          {/* Hide Location Option (only if public) */}
          {isPublic && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideExactLocation}
                onChange={(e) => setHideExactLocation(e.target.checked)}
                className="h-4 w-4 rounded border-[#334155] bg-[#1A2D3D] text-white text-primary focus:ring-primary"
              />
              <span className="text-xs text-gray-400">Hide exact location (show region only)</span>
            </label>
          )}

          {/* Privacy Info Box */}
          <div className="rounded-lg bg-[#1A2D3D] border border-[#334155] p-3 text-[11px] text-gray-400">
            <div className="flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="space-y-1.5">
                <p className="font-medium text-gray-400">What's shared publicly?</p>
                <ul className="space-y-0.5 text-gray-500">
                  <li>• Species, weight, and photo</li>
                  <li>• General area (e.g. "Cornwall")</li>
                  <li>• Date caught</li>
                </ul>
                <p className="font-medium text-gray-400 pt-1">🔒 Never shared:</p>
                <ul className="space-y-0.5 text-gray-500">
                  <li>• Exact GPS coordinates</li>
                  <li>• Your precise fishing spot</li>
                </ul>
                <p className="text-slate-400 pt-1 italic">You can hide any catch from the feed later.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-xl bg-navy-800 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-900 disabled:opacity-70"
        >
          {isSubmitting ? 'Saving…' : 'Save Catch'}
        </button>
      </div>
    </form>
  )
}
