import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useActiveSession } from '../../hooks/useActiveSession'
import { useSessionParticipant } from '../../hooks/useSessionParticipant'
import type { Catch } from '../../types'
import { LocationPicker } from '../map/LocationPicker'
import { uploadCatchPhoto } from '../../hooks/usePhotoUpload'
import { FISH_SPECIES, getSpeciesByCategory } from '../../lib/constants'
import { useFreshwaterEnabled } from '../../hooks/useFeatureFlags'
import { getOrCreateSessionForCatch } from '../../lib/autoSession'
import { useCatchXP } from '../../hooks/useCatchXP'
import { useCelebrateChallenges } from '../../hooks/useCelebrateChallenges'
import { Globe, Lock, Info, X, Plus } from 'lucide-react'
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
import { kgToLbsOz, lbsOzToKg } from '../../utils/weight'
import { useWeightUnit } from '../../hooks/useWeightUnit'

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
    .min(1, 'Latitude is required')
    .refine((val) => !Number.isNaN(Number(val)), { message: 'Latitude must be a number' }),
  longitude: z
    .string()
    .min(1, 'Longitude is required')
    .refine((val) => !Number.isNaN(Number(val)), { message: 'Longitude must be a number' }),
  weight_kg: z
    .string()
    .optional()
    .refine((val) => !val || (!Number.isNaN(Number(val)) && Number(val) > 0), {
      message: 'Weight must be a positive number',
    }),
  length_cm: z
    .string()
    .optional()
    .refine((val) => !val || (!Number.isNaN(Number(val)) && Number(val) > 0), {
      message: 'Length must be a positive number',
    }),
  bait: z.string().optional(),
  rig: z.string().optional(),
  fishing_style: z.string().optional(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  peg_swim: z.string().optional(),
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
  // Backlog mode - for logging old catches (no XP/badges)
  isBacklog?: boolean
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
    weever: 'Weever (Greater)',
    'weever fish': 'Weever (Greater)',
    'greater weever': 'Weever (Greater)',
    'greater weever fish': 'Weever (Greater)',
    'lesser weever': 'Weever (Lesser)',
    'lesser weever fish': 'Weever (Lesser)',
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
  isBacklog = false,
}: CatchFormProps) {
  const { user } = useAuth()
  const { data: activeSession } = useActiveSession()
  const catchXP = useCatchXP()
  const { celebrateChallenges } = useCelebrateChallenges()
  const freshwaterEnabled = useFreshwaterEnabled()
  const { unit: weightUnit } = useWeightUnit()
  
  // Get species categories based on freshwater feature flag
  const allSpeciesCategories = getSpeciesByCategory(freshwaterEnabled)
  
  // Filter species based on session water type
  // Freshwater types: Lake/Reservoir, River, Canal, Pond (also handle legacy 'freshwater' value)
  // Saltwater types: Sea/Coastal (also handle legacy 'saltwater' value)
  const sessionWaterType = activeSession?.water_type
  const isLakeSession = Boolean(activeSession?.lake_id)
  const isFreshwaterSession =
    isLakeSession ||
    (sessionWaterType && ['Lake/Reservoir', 'River', 'Canal', 'Pond', 'freshwater'].includes(sessionWaterType as string))
  const isSaltwaterSession = sessionWaterType && ['Sea/Coastal', 'saltwater'].includes(sessionWaterType as string)
  
  // For freshwater sessions, only show coarse and game fish
  // For saltwater sessions, only show saltwater fish
  // If no session or unknown water type, show all
  const speciesCategories = {
    saltwater: isFreshwaterSession ? [] : allSpeciesCategories.saltwater,
    coarse: isSaltwaterSession ? [] : allSpeciesCategories.coarse,
    game: isSaltwaterSession ? [] : allSpeciesCategories.game,
  }
  
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
  const [formError, setFormError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(prefilledPhotoFile || null)
  // Backlog catches default to private (no auto-post to feed)
  const [isPublic, setIsPublic] = useState(!isBacklog)
  const [hideExactLocation, setHideExactLocation] = useState(false)
  
  // Multi-catch mode (for feathers, multi-hook rigs)
  const [isMultiCatch, setIsMultiCatch] = useState(false)
  const [multiCatchSpecies, setMultiCatchSpecies] = useState<string[]>([])
  const [selectedSpeciesForMulti, setSelectedSpeciesForMulti] = useState('')
  const [imperialWeight, setImperialWeight] = useState<{ pounds: string; ounces: string }>({
    pounds: '',
    ounces: '',
  })
  
  // Legal size tracking
  const [speciesId, setSpeciesId] = useState<string | null>(null)
  const [returned, setReturned] = useState(false)
  const REGION_FOR_RULES: RegionCode = 'uk_england'
  
  // EXIF metadata from photo
  const [photoMetadata, setPhotoMetadata] = useState<PhotoMetadata | null>(prefilledMetadata || null)

  // Fish health reporting (for lake sessions)
  const [fishHealthIssue, setFishHealthIssue] = useState(initialCatch?.fish_health_issue ?? false)
  const [fishHealthType, setFishHealthType] = useState<string>(initialCatch?.fish_health_type ?? '')
  const [fishHealthNotes, setFishHealthNotes] = useState(initialCatch?.fish_health_notes ?? '')
  const [treatmentApplied, setTreatmentApplied] = useState(initialCatch?.treatment_applied ?? false)
  const [treatmentNotes, setTreatmentNotes] = useState(initialCatch?.treatment_notes ?? '')

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
        peg_swim: initialCatch.peg_swim ?? undefined,
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

  useEffect(() => {
    if (initialCatch?.weight_kg != null) {
      const { pounds, ounces } = kgToLbsOz(initialCatch.weight_kg)
      setImperialWeight({
        pounds: pounds ? pounds.toString() : '',
        ounces: ounces ? ounces.toString() : '',
      })
    }
  }, [initialCatch?.weight_kg])

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

  useEffect(() => {
    if (weightUnit !== 'imperial') return
    const pounds = Number(imperialWeight.pounds) || 0
    const ounces = Number(imperialWeight.ounces) || 0
    const hasWeight = pounds > 0 || ounces > 0
    setValue('weight_kg', hasWeight ? lbsOzToKg(pounds, ounces).toFixed(3) : '', { shouldValidate: false })
  }, [imperialWeight, setValue, weightUnit])

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

  // Auto-check released toggle when fish is undersized (soft nudge)
  // Also auto-set for freshwater sessions (mandatory release)
  useEffect(() => {
    if (legalStatus.status === 'undersized' && !returned) {
      setReturned(true)
    }
  }, [legalStatus.status])

  useEffect(() => {
    if (isFreshwaterSession) {
      setReturned(true)
    }
  }, [isFreshwaterSession])

  const onSubmit = async (values: CatchFormValues) => {
    if (!user) {
      setFormError('You must be logged in to add a catch.')
      toast.error('You must be logged in to add a catch.')
      return
    }

    // Validate multi-catch mode has at least one species
    if (isMultiCatch && multiCatchSpecies.length === 0) {
      setFormError('Please add at least one species for multi-catch.')
      toast.error('Please add at least one species.')
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

    const latitudeNumber = values.latitude ? Number(values.latitude) : null
    const longitudeNumber = values.longitude ? Number(values.longitude) : null

    const weightKgNumber =
      weightUnit === 'imperial'
        ? (() => {
            const pounds = Number(imperialWeight.pounds) || 0
            const ounces = Number(imperialWeight.ounces) || 0
            const hasWeight = pounds > 0 || ounces > 0
            if (!hasWeight) return null
            return Number(lbsOzToKg(pounds, ounces).toFixed(3))
          })()
        : values.weight_kg
            ? Number(values.weight_kg)
            : null
    const lengthCmNumber = values.length_cm ? Number(values.length_cm) : null
    
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
            latitude: latitudeNumber,
            longitude: longitudeNumber,
            locationName: values.location_name,
            caughtAt: caughtAtIso,
          })
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
    if (weatherTemp === null && latitudeNumber != null && longitudeNumber != null) {
      try {
        const weatherData = await getCompleteWeatherData(latitudeNumber, longitudeNumber).catch(() => null)
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

    // Detect country from coordinates (shared by all catches)
    let countryCode: string | null = null
    if (latitudeNumber != null && longitudeNumber != null) {
      try {
        countryCode = await getCountryFromCoords(latitudeNumber, longitudeNumber)
      } catch (err) {
        console.warn('Failed to detect country:', err)
      }
    }

    const isEdit = mode === 'edit' && catchId

    // ========================================
    // MULTI-CATCH MODE: Create multiple records
    // ========================================
    if (isMultiCatch && multiCatchSpecies.length > 0 && !isEdit) {
      // Generate a shared group ID for all catches in this multi-catch
      const multiCatchGroupId = crypto.randomUUID()
      
      // Build payloads for each species
      const payloads = multiCatchSpecies.map((species) => ({
        user_id: user.id,
        species,
        caught_at: caughtAtIso,
        location_name: values.location_name,
        latitude: latitudeNumber,
        longitude: longitudeNumber,
        weight_kg: null, // No weight in multi-catch mode
        length_cm: null, // No length in multi-catch mode
        bait: values.bait?.trim() ? values.bait.trim() : null,
        rig: values.rig?.trim() ? values.rig.trim() : null,
        fishing_style: values.fishing_style?.trim() ? values.fishing_style.trim() : null,
        photo_url: photoUrl,
        notes: values.notes?.trim() ? values.notes.trim() : null,
        session_id: sessionId,
        mark_id: markId,
        is_public: isPublic,
        hide_exact_location: hideExactLocation,
        weather_temp: weatherTemp,
        weather_condition: weatherCondition,
        wind_speed: windSpeed,
        moon_phase: getMoonPhase().phase,
        species_id: SPECIES.find((s) => s.displayName === species)?.id ?? null,
        region: REGION_FOR_RULES,
        returned: false,
        photo_exif_latitude: photoMetadata?.latitude ?? null,
        photo_exif_longitude: photoMetadata?.longitude ?? null,
        photo_exif_timestamp: photoMetadata?.timestamp ?? null,
        photo_camera_make: photoMetadata?.cameraMake ?? null,
        photo_camera_model: photoMetadata?.cameraModel ?? null,
        country_code: countryCode,
        multi_catch_group_id: multiCatchGroupId,
        peg_swim: values.peg_swim?.trim() ? values.peg_swim.trim() : null,
        is_backlog: isBacklog,
      }))


      const { data: insertedCatches, error } = await supabase
        .from('catches')
        .insert(payloads)
        .select()

      if (error) {
        setFormError(error.message)
        toast.error(error.message)
        return
      }

      // Award XP for each catch (skip for backlog catches)
      if (insertedCatches && insertedCatches.length > 0 && !isBacklog) {
        for (const catchData of insertedCatches) {
          catchXP.mutateAsync({
            catchId: catchData.id,
            species: catchData.species,
            weightKg: catchData.weight_kg,
            weightLb: catchData.weight_kg ? catchData.weight_kg * 2.205 : null,
            sessionId: catchData.session_id,
            hasPhoto: !!catchData.photo_url,
            caughtAt: catchData.caught_at,
            latitude: catchData.latitude,
            longitude: catchData.longitude,
            weatherCondition: catchData.weather_condition,
            windSpeed: catchData.wind_speed,
            moonPhase: catchData.moon_phase,
            countryCode,
          }).then((result) => {
            if (result.challengesCompleted.length > 0) {
              celebrateChallenges(result.challengesCompleted, {
                newLevel: result.newLevel,
                leveledUp: result.leveledUp,
              })
            }
          }).catch((err) => {
            console.error('[CatchForm] XP mutation error:', err)
          })
        }

        // Auto-post public catches to feed (multi-catch mode)
        if (isPublic) {
          try {
            const postPayloads = insertedCatches.map((catchData) => ({
              user_id: user.id,
              type: 'catch' as const,
              catch_id: catchData.id,
              caption: null,
              photo_url: catchData.photo_url,
              is_public: true,
            }))
            await supabase.from('posts').insert(postPayloads)
          } catch (postErr) {
            console.warn('Failed to auto-post catches to feed:', postErr)
          }
        }

        toast.success(`Logged ${insertedCatches.length} catches!`)
      }

      onSuccess()
      return
    }

    // ========================================
    // SINGLE CATCH MODE (existing logic)
    // ========================================
    const payload = {
      user_id: user.id,
      species: values.species,
      caught_at: caughtAtIso,
      location_name: values.location_name,
      latitude: latitudeNumber,
      longitude: longitudeNumber,
      weight_kg: weightKgNumber,
      length_cm: lengthCmNumber,
      bait: values.bait?.trim() ? values.bait.trim() : null,
      rig: values.rig?.trim() ? values.rig.trim() : null,
      fishing_style: values.fishing_style?.trim() ? values.fishing_style.trim() : null,
      photo_url: photoUrl,
      notes: values.notes?.trim() ? values.notes.trim() : null,
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
      country_code: countryCode,
      peg_swim: values.peg_swim?.trim() ? values.peg_swim.trim() : null,
      is_backlog: isBacklog,
      // Fish health reporting
      fish_health_issue: fishHealthIssue,
      fish_health_type: fishHealthIssue && fishHealthType ? fishHealthType : null,
      fish_health_notes: fishHealthIssue && fishHealthNotes.trim() ? fishHealthNotes.trim() : null,
      fish_health_photo_url: null, // Will be uploaded separately if needed
      treatment_applied: fishHealthIssue ? treatmentApplied : false,
      treatment_notes: fishHealthIssue && treatmentApplied && treatmentNotes.trim() ? treatmentNotes.trim() : null,
    }


    const { data, error } = isEdit
      ? await supabase.from('catches').update(payload).eq('id', catchId).select().single()
      : await supabase.from('catches').insert(payload).select().single()

    if (error) {
      setFormError(error.message)
      toast.error(error.message)
      return
    }

    // Award XP for new catches (not edits, not backlog)
    if (!isEdit && data && !isBacklog) {
      catchXP.mutateAsync({
        catchId: data.id,
        species: data.species,
        weightKg: data.weight_kg,
        weightLb: data.weight_kg ? data.weight_kg * 2.205 : null,
        sessionId: data.session_id,
        hasPhoto: !!data.photo_url,
        caughtAt: data.caught_at,
        latitude: data.latitude,
        longitude: data.longitude,
        weatherCondition: data.weather_condition,
        windSpeed: data.wind_speed,
        moonPhase: data.moon_phase,
        countryCode: payload.country_code,
        released: returned,
      }).then((result) => {
        if (result.challengesCompleted.length > 0) {
          celebrateChallenges(result.challengesCompleted, {
            newLevel: result.newLevel,
            leveledUp: result.leveledUp,
          })
        }
      }).catch((err) => {
        console.error('[CatchForm] XP mutation error:', err)
      })

      // Auto-post to feed if catch is public (friends feed visibility is handled by follow/privacy rules)
      if (isPublic) {
        try {
          await supabase.from('posts').insert({
            user_id: user.id,
            type: 'catch',
            catch_id: data.id,
            caption: null, // User can edit caption later if they want
            photo_url: data.photo_url,
            is_public: true,
          })
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
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:border-red-500/40 dark:text-red-400">
          {formError}
        </div>
      ) : null}

      {mode === 'create' && activeSession ? (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-500/40 dark:text-emerald-400">
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
            existingPhotoUrl={initialCatch?.photo_url}
            onPhotoChange={(file: File | null) => {
              setPhotoFile(file)
              if (!file) {
                setPhotoMetadata(null)
              }
            }}
            onSpeciesIdentified={(result: FishIdentificationResult) => {
              const speciesValue = mapAiResultToDisplayName(result) || ''
              
              setValue('species', speciesValue, { shouldValidate: true })
              
              // Also set speciesId for legal size checks
              const species = SPECIES.find((s) => s.displayName === speciesValue)
              setSpeciesId(species?.id ?? null)
              
              if (speciesValue) {
                toast.success(`Species set to ${speciesValue}`)
              }
            }}
            onMetadataExtracted={(metadata: PhotoMetadata) => {
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
        {/* Multi-catch toggle - only show in create mode */}
        {mode === 'create' && (
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isMultiCatch}
                  onChange={(e) => {
                    setIsMultiCatch(e.target.checked)
                    if (!e.target.checked) {
                      setMultiCatchSpecies([])
                      setSelectedSpeciesForMulti('')
                    }
                  }}
                  className="peer sr-only"
                />
                <div className="h-5 w-5 rounded-md border-2 border-border bg-background transition-colors peer-checked:border-navy-800 peer-checked:bg-navy-800 peer-focus:ring-2 peer-focus:ring-navy-800/30" />
                <svg
                  className="absolute left-0.5 top-0.5 h-4 w-4 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">Multi-catch</span>
                <span className="text-xs text-muted-foreground">(feathers, multi-hook rig)</span>
              </div>
            </label>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {isMultiCatch ? 'Species caught' : 'Species'}
          </label>
          
          {isMultiCatch ? (
            <>
              {/* Multi-catch species list builder */}
              <div className="flex gap-2 mb-2">
                <select
                  value={selectedSpeciesForMulti}
                  onChange={(e) => setSelectedSpeciesForMulti(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Add a fish...</option>
                  <optgroup label="Saltwater">
                    {speciesCategories.saltwater.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                  {speciesCategories.coarse.length > 0 && (
                    <optgroup label="Coarse">
                      {speciesCategories.coarse.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                  )}
                  {speciesCategories.game.length > 0 && (
                    <optgroup label="Game">
                      {speciesCategories.game.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                  )}
                  <option value="Other">Other / not listed</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSpeciesForMulti) {
                      setMultiCatchSpecies([...multiCatchSpecies, selectedSpeciesForMulti])
                      setSelectedSpeciesForMulti('')
                    }
                  }}
                  disabled={!selectedSpeciesForMulti}
                  className="flex items-center gap-1 rounded-md bg-navy-800 px-3 py-2 text-xs font-medium text-white hover:bg-navy-900 disabled:bg-navy-400 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
              
              {/* Species chips */}
              {multiCatchSpecies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {multiCatchSpecies.map((species, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {species}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...multiCatchSpecies]
                          updated.splice(index, 1)
                          setMultiCatchSpecies(updated)
                        }}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground mb-2">
                  Add each fish you caught. You can add the same species multiple times.
                </p>
              )}
              
              {multiCatchSpecies.length === 0 && (
                <p className="text-[11px] text-red-600">Add at least one species</p>
              )}
            </>
          ) : (
            <>
              {/* Single species dropdown */}
              <select
                id="species"
                className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
            </>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="caught_at">
            Date & time
          </label>
          <input
            id="caught_at"
            type="datetime-local"
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('caught_at')}
          />
          {errors.caught_at ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.caught_at.message}</p>
          ) : null}
        </div>

        {/* Quick mark picker */}
        {savedMarks.length > 0 && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Use a saved mark (optional)
            </label>
            <select
              className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="location_name">
            Location name
          </label>
          <input
            id="location_name"
            type="text"
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g. Chesil Beach, Dorset"
            {...register('location_name')}
          />
          {errors.location_name ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.location_name.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground">Pick location on map</p>
            <button
              type="button"
              className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
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
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tap or drag the pin to your fishing spot. Coordinates are saved automatically.
          </p>
          {errors.latitude ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.latitude.message}</p>
          ) : null}
          {errors.longitude ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.longitude.message}</p>
          ) : null}
        </div>

        {/* Weight/Length - hidden in multi-catch mode (can be added later per fish) */}
        {!isMultiCatch && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="weight_kg">
                Weight ({weightUnit === 'imperial' ? 'lb + oz' : 'kg'})
              </label>
              {weightUnit === 'imperial' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      id="weight_lbs"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="1"
                      value={imperialWeight.pounds}
                      onChange={(e) =>
                        setImperialWeight((prev) => ({
                          ...prev,
                          pounds: e.target.value,
                        }))
                      }
                      placeholder="lb"
                      className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      id="weight_oz"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.1"
                      value={imperialWeight.ounces}
                      onChange={(e) =>
                        setImperialWeight((prev) => ({
                          ...prev,
                          ounces: e.target.value,
                        }))
                      }
                      placeholder="oz"
                      className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <input type="hidden" {...register('weight_kg')} />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    We store weights in kg but show your preference. Change units in Settings.
                  </p>
                </>
              ) : (
                <>
                  <input
                    id="weight_kg"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    {...register('weight_kg')}
                  />
                  {errors.weight_kg ? (
                    <p className="mt-1 text-[11px] text-red-600">{errors.weight_kg.message as string}</p>
                  ) : null}
                </>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="length_cm">
                Length (cm)
              </label>
              <input
                id="length_cm"
                type="number"
                inputMode="decimal"
                step="0.1"
                className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                {...register('length_cm')}
              />
              {errors.length_cm ? (
                <p className="mt-1 text-[11px] text-red-600">{errors.length_cm.message as string}</p>
              ) : null}
              
              {/* Legal size status */}
              {legalStatus.status === 'undersized' && legalStatus.rule?.minLengthCm ? (
                <div className="mt-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    This {watchedSpecies || 'fish'} is below the minimum size of {legalStatus.rule.minLengthCm}cm. 
                    Most anglers return undersized fish to help stocks recover.
                  </p>
                </div>
              ) : legalStatus.status === 'legal' ? (
                <p className="mt-1 text-[11px] text-emerald-600">
                  ✓ Meets suggested minimum size for this region
                </p>
              ) : null}
            </div>
          </>
        )}

        {/* Released toggle - only show for saltwater (freshwater is mandatory release) */}
        {!isFreshwaterSession && (
          <div className="rounded-lg border border-border bg-card p-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐟</span>
                <div>
                  <span className="text-sm font-medium text-foreground">Released</span>
                  <p className="text-[11px] text-muted-foreground">I returned this fish to the water</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {returned && (
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                    +5 XP
                  </span>
                )}
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={returned}
                    onChange={(e) => setReturned(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-emerald-500 transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
                </div>
              </div>
            </label>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="bait">
            Bait
          </label>
          <input
            id="bait"
            type="text"
            placeholder="e.g. lugworm, ragworm, squid"
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('bait')}
          />
          {errors.bait ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.bait.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="rig">
            Rig
          </label>
          <input
            id="rig"
            type="text"
            placeholder="e.g. running ledger, paternoster"
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('rig')}
          />
          {errors.rig ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.rig.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="fishing_style">
            Fishing style
          </label>
          <select
            id="fishing_style"
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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

        {/* Peg/Swim - only show for lake sessions */}
        {activeSession?.lake_id && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="peg_swim">
              Peg / Swim
            </label>
            <input
              type="text"
              id="peg_swim"
              className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g., Peg 12, Swim 3"
              {...register('peg_swim')}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Where on the lake were you fishing?
            </p>
          </div>
        )}

        {/* Fish Health Reporting - only show for lake sessions */}
        {activeSession?.lake_id && (
          <div className="sm:col-span-2 rounded-lg border border-border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🩺</span>
                <div>
                  <p className="text-xs font-medium text-foreground">Fish Health Report</p>
                  <p className="text-[10px] text-muted-foreground">Report any issues with this fish</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFishHealthIssue(!fishHealthIssue)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  fishHealthIssue ? 'bg-amber-500' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    fishHealthIssue ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {fishHealthIssue && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Type of Issue
                  </label>
                  <select
                    value={fishHealthType}
                    onChange={(e) => setFishHealthType(e.target.value)}
                    className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select issue type</option>
                    <option value="ulcer">Ulcer / Sore</option>
                    <option value="fin_damage">Fin Damage</option>
                    <option value="mouth_damage">Mouth Damage</option>
                    <option value="scale_loss">Scale Loss</option>
                    <option value="parasite">Parasite</option>
                    <option value="fungus">Fungus</option>
                    <option value="lesion">Lesion / Wound</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    value={fishHealthNotes}
                    onChange={(e) => setFishHealthNotes(e.target.value)}
                    rows={2}
                    className="block w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Describe what you observed..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Treatment Applied?</p>
                    <p className="text-[10px] text-muted-foreground">Did you apply any treatment?</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTreatmentApplied(!treatmentApplied)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      treatmentApplied ? 'bg-green-500' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        treatmentApplied ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {treatmentApplied && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Treatment Details
                    </label>
                    <input
                      type="text"
                      value={treatmentNotes}
                      onChange={(e) => setTreatmentNotes(e.target.value)}
                      className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="e.g., Applied antiseptic, used Klinik"
                    />
                  </div>
                )}

                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  ⚠️ This report will be visible to the lake owner to help monitor fish health.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            className="block w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Conditions, tactics, who you were fishing with, etc."
            {...register('notes')}
          />
          {errors.notes ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.notes.message}</p>
          ) : null}
        </div>

        {/* Privacy Settings */}
        <div className="sm:col-span-2 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Sharing</p>
          
          {/* Public/Private Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                isPublic
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
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
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
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
                className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">Hide exact location (show region only)</span>
            </label>
          )}

          {/* Privacy Info Box */}
          <div className="rounded-lg border border-border bg-muted p-3 text-[11px] text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div className="space-y-1.5">
                <p className="font-medium text-muted-foreground">What's shared publicly?</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>• Species, weight, and photo</li>
                  <li>• General area (e.g. "Cornwall")</li>
                  <li>• Date caught</li>
                </ul>
                <p className="pt-1 font-medium text-muted-foreground">🔒 Never shared:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>• Exact GPS coordinates</li>
                  <li>• Your precise fishing spot</li>
                </ul>
                <p className="pt-1 italic text-muted-foreground">You can hide any catch from the feed later.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-xl bg-navy-800 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-900 disabled:bg-navy-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving…' : 'Save Catch'}
        </button>
      </div>
    </form>
  )
}
