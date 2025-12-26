import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import type { Catch, Session } from '../../types'
import { getSpeciesByCategory } from '../../lib/constants'
import { useFreshwaterEnabled } from '../../hooks/useFeatureFlags'
import { Camera, X, Globe, Lock, Info, MapPin, ChevronDown } from 'lucide-react'
import { useCatchXP } from '../../hooks/useCatchXP'
import { useSavedMarks } from '../../hooks/useSavedMarks'
import { useCelebrateChallenges } from '../../hooks/useCelebrateChallenges'
import { uploadCatchPhoto } from '../../hooks/usePhotoUpload'
import { getCountryFromCoords } from '../../utils/reverseGeocode'
import { lbsOzToKg } from '../../utils/weight'
import { useWeightUnit } from '../../hooks/useWeightUnit'
import { useSessionParticipants } from '../../hooks/useSessionParticipants'

const quickLogSchema = z.object({
  species: z.string().min(1, 'Species is required'),
  caught_at: z.string().min(1, 'Time is required'),
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
  notes: z.string().max(200, 'Notes must be 200 characters or less').optional(),
})

export type QuickLogValues = z.infer<typeof quickLogSchema>

type QuickLogFormProps = {
  session: Session
  onLogged: (catchItem: Catch) => void
  onClose: () => void
}

type LocationSource = 'session' | 'mark' | 'current'

export function QuickLogForm({ session, onLogged, onClose }: QuickLogFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [hideExactLocation, setHideExactLocation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const catchXP = useCatchXP()
  const { marks = [] } = useSavedMarks()
  const { celebrateChallenges } = useCelebrateChallenges()
  const freshwaterEnabled = useFreshwaterEnabled()
  const { unit: weightUnit } = useWeightUnit()
  const [imperialWeight, setImperialWeight] = useState<{ pounds: string; ounces: string }>({
    pounds: '',
    ounces: '',
  })
  
  // Fetch session participants for "who caught this" selector
  const { data: sessionParticipants = [] } = useSessionParticipants(session.id)
  
  // Who caught this fish (defaults to current user)
  const [caughtByUserId, setCaughtByUserId] = useState<string>('')
  
  // Set default to current user when component mounts
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setCaughtByUserId(data.user.id)
      }
    }
    void loadUser()
  }, [])
  
  // Get species categories based on freshwater feature flag
  const allSpeciesCategories = getSpeciesByCategory(freshwaterEnabled)

  // Filter species based on session water type
  // Freshwater types: Lake/Reservoir, River, Canal, Pond (also handle legacy 'freshwater' value)
  // Saltwater types: Sea/Coastal (also handle legacy 'saltwater' value)
  const sessionWaterType = session.water_type
  const isLakeSession = Boolean(session.lake_id)
  const isFreshwaterSession =
    isLakeSession ||
    (sessionWaterType && ['Lake/Reservoir', 'River', 'Canal', 'Pond', 'freshwater'].includes(sessionWaterType as string))
  const isSaltwaterSession = sessionWaterType && ['Sea/Coastal', 'saltwater'].includes(sessionWaterType as string)

  const speciesCategories = {
    saltwater: isFreshwaterSession ? [] : allSpeciesCategories.saltwater,
    coarse: isSaltwaterSession ? [] : allSpeciesCategories.coarse,
    game: isSaltwaterSession ? [] : allSpeciesCategories.game,
  }
  
  // If no species are available (unknown water type), show all species
  const hasAnySpecies = speciesCategories.saltwater.length > 0 || 
                        speciesCategories.coarse.length > 0 || 
                        speciesCategories.game.length > 0
  
  if (!hasAnySpecies) {
    speciesCategories.saltwater = allSpeciesCategories.saltwater
    speciesCategories.coarse = allSpeciesCategories.coarse
    speciesCategories.game = allSpeciesCategories.game
  }

  // Location state
  const hasSessionLocation = !!(session.latitude && session.longitude)
  const [locationSource, setLocationSource] = useState<LocationSource>(hasSessionLocation ? 'session' : 'current')
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; name: string } | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  // Get current location if needed
  useEffect(() => {
    if (locationSource === 'current' && !currentLocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: 'Current location',
          })
        },
        () => {
          // If geolocation fails and no session location, show picker
          if (!hasSessionLocation) {
            setShowLocationPicker(true)
          }
        }
      )
    }
  }, [locationSource, currentLocation, hasSessionLocation])

  // Compute active location based on source
  const getActiveLocation = () => {
    if (locationSource === 'session' && hasSessionLocation) {
      return {
        name: session.location_name || 'Session location',
        lat: session.latitude,
        lng: session.longitude,
      }
    }
    if (locationSource === 'mark' && selectedMarkId) {
      const mark = marks.find((m) => m.id === selectedMarkId)
      if (mark) {
        return {
          name: mark.name,
          lat: mark.latitude,
          lng: mark.longitude,
        }
      }
    }
    if (locationSource === 'current' && currentLocation) {
      return currentLocation
    }
    // Fallback to session if available
    if (hasSessionLocation) {
      return {
        name: session.location_name || 'Session location',
        lat: session.latitude,
        lng: session.longitude,
      }
    }
    return null
  }

  const activeLocation = getActiveLocation()

  const defaultNow = new Date().toISOString().slice(0, 16)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be less than 20MB')
      return
    }

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoFile) return null

    setIsUploading(true)
    try {
      const { url } = await uploadCatchPhoto({ file: photoFile, userId })
      return url
    } catch (error) {
      console.error('Error uploading photo:', error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuickLogValues>({
    resolver: zodResolver(quickLogSchema),
    defaultValues: {
      caught_at: defaultNow,
    },
  })

  useEffect(() => {
    if (weightUnit !== 'imperial') return
    const pounds = Number(imperialWeight.pounds) || 0
    const ounces = Number(imperialWeight.ounces) || 0
    const hasWeight = pounds > 0 || ounces > 0
    setValue('weight_kg', hasWeight ? lbsOzToKg(pounds, ounces).toFixed(3) : '', { shouldValidate: false })
  }, [imperialWeight, setValue, weightUnit])

  const onSubmit = async (values: QuickLogValues) => {
    setFormError(null)

    const { data: userData, error: authError } = await supabase.auth.getUser()

    if (authError || !userData.user) {
      const message = authError?.message ?? 'You must be logged in to log a catch.'
      setFormError(message)
      toast.error(message)
      return
    }

    // Upload photo if present
    let photoUrl: string | null = null
    if (photoFile) {
      try {
        photoUrl = await uploadPhoto(userData.user.id)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload photo'
        toast.error(message)
        return
      }
    }

    // Get coordinates for this catch
    const catchLat = activeLocation?.lat || session.latitude || null
    const catchLng = activeLocation?.lng || session.longitude || null

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

    // Detect country from coordinates (don't block on this)
    let countryCode: string | null = null
    if (catchLat && catchLng) {
      try {
        countryCode = await getCountryFromCoords(catchLat, catchLng)
      } catch (err) {
        console.warn('Failed to detect country:', err)
      }
    }

    const payload = {
      user_id: caughtByUserId || userData.user.id,
      logged_by_user_id: caughtByUserId !== userData.user.id ? userData.user.id : null,
      approval_status: (caughtByUserId && caughtByUserId !== userData.user.id) ? 'pending' : 'approved',
      approval_requested_at: (caughtByUserId && caughtByUserId !== userData.user.id) ? new Date().toISOString() : null,
      session_id: session.id,
      species: values.species,
      caught_at: new Date(values.caught_at).toISOString(),
      location_name: activeLocation?.name || session.location_name || null,
      latitude: catchLat,
      longitude: catchLng,
      weight_kg: weightKgNumber,
      length_cm: lengthCmNumber,
      bait: null,
      rig: null,
      fishing_style: null,
      photo_url: photoUrl,
      notes: values.notes?.trim() ? values.notes.trim() : null,
      is_public: isPublic,
      hide_exact_location: hideExactLocation,
      // Copy weather snapshot from parent session
      weather_temp: session.weather_temp ?? null,
      weather_condition: session.weather_condition ?? null,
      wind_speed: session.wind_speed ?? null,
      moon_phase: session.moon_phase ?? null,
      // Country code for geographic challenges
      country_code: countryCode,
    }

    const { data, error } = await supabase.from('catches').insert(payload).select('*').single()

    if (error || !data) {
      const message = error?.message ?? 'Failed to log catch.'
      setFormError(message)
      toast.error(message)
      return
    }

    const created = data as Catch
    
    // Award XP for the catch and trigger celebration
    // Skip XP if logging for someone else - they'll get it when they approve
    const isLoggingForSomeoneElse = caughtByUserId && caughtByUserId !== userData.user.id
    if (!isLoggingForSomeoneElse) {
      catchXP.mutateAsync({
      catchId: created.id,
      species: created.species,
      weightKg: created.weight_kg,
      weightLb: created.weight_kg ? created.weight_kg * 2.205 : null,
      sessionId: created.session_id,
      hasPhoto: !!created.photo_url,
      caughtAt: created.caught_at,
      latitude: created.latitude,
      longitude: created.longitude,
      weatherCondition: created.weather_condition,
      windSpeed: created.wind_speed,
      moonPhase: created.moon_phase,
      countryCode,
      }).then((result) => {
        if (result.challengesCompleted.length > 0) {
          celebrateChallenges(result.challengesCompleted, {
            newLevel: result.newLevel,
            leveledUp: result.leveledUp,
          })
        }
      }).catch((err) => {
        console.error('[QuickLogForm] XP mutation error:', err)
      })
    }
    
    onLogged(created)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {formError ? (
        <div className="rounded-md bg-red-900/30 border border-red-500/40 px-3 py-2 text-xs text-red-400">{formError}</div>
      ) : null}

      {/* Participant selector - show when there are participants */}
      {sessionParticipants.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Who caught this fish?
          </label>
          <select
            value={caughtByUserId}
            onChange={(e) => setCaughtByUserId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {sessionParticipants.map((participant) => {
              const isCurrentUser = participant.user_id === caughtByUserId
              const displayName = participant.user?.username || participant.user?.full_name || 'Unknown'
              const status = participant.status || 'pending'
              const statusLabel = status === 'pending' ? ' (invited)' : ''
              
              return (
                <option key={participant.id} value={participant.user_id}>
                  {isCurrentUser ? 'Me' : displayName}{statusLabel}
                </option>
              )
            })}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            You can log catches for other people in this session.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="species">
            Species
          </label>
          <select
            id="species"
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('species')}
          >
            <option value="">Select species</option>
            {speciesCategories.saltwater.length > 0 && (
              <optgroup label="Saltwater">
                {speciesCategories.saltwater.map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            )}
            {speciesCategories.coarse.length > 0 && (
              <optgroup label="Coarse">
                {speciesCategories.coarse.map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            )}
            {speciesCategories.game.length > 0 && (
              <optgroup label="Game">
                {speciesCategories.game.map((s: string) => (
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

        {/* Location picker */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Location
          </label>
          {showLocationPicker ? (
            <div className="space-y-2">
              {/* Session location option */}
              {hasSessionLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setLocationSource('session')
                    setShowLocationPicker(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-colors ${
                    locationSource === 'session'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-muted'
                  }`}
                >
                  <MapPin size={14} className="text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Session location</p>
                    <p className="text-[10px] text-muted-foreground">{session.location_name || 'From session'}</p>
                  </div>
                </button>
              )}

              {/* Saved marks */}
              {marks.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">My Marks</p>
                  {marks.slice(0, 5).map((mark) => (
                    <button
                      key={mark.id}
                      type="button"
                      onClick={() => {
                        setLocationSource('mark')
                        setSelectedMarkId(mark.id)
                        setShowLocationPicker(false)
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-colors ${
                        locationSource === 'mark' && selectedMarkId === mark.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted'
                      }`}
                    >
                      <MapPin size={14} className="text-blue-400" />
                      <span className="font-medium text-foreground">{mark.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Current location */}
              <button
                type="button"
                onClick={() => {
                  setLocationSource('current')
                  setShowLocationPicker(false)
                }}
                className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-colors ${
                  locationSource === 'current'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted'
                }`}
              >
                <MapPin size={14} className="text-green-400" />
                <div>
                  <p className="font-medium text-foreground">Current location</p>
                  <p className="text-[10px] text-muted-foreground">Use GPS</p>
                </div>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLocationPicker(true)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-primary/50 hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {activeLocation?.name || 'Select location'}
                </span>
              </div>
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="caught_at">
            Time
          </label>
          <input
            id="caught_at"
            type="datetime-local"
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary max-w-full"
            style={{ minWidth: 0 }}
            {...register('caught_at')}
          />
          {errors.caught_at ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.caught_at.message}</p>
          ) : null}
        </div>

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
                Stored in kg, shown in your preferred unit.
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
                <p className="mt-1 text-[11px] text-red-400">{errors.weight_kg.message as string}</p>
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
            <p className="mt-1 text-[11px] text-red-400">{errors.length_cm.message as string}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="notes">
            Quick note (optional)
          </label>
          <textarea
            id="notes"
            rows={2}
            className="block w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Rig, depth, what happened"
            {...register('notes')}
          />
          {errors.notes ? (
            <p className="mt-1 text-[11px] text-red-400">{errors.notes.message}</p>
          ) : null}
        </div>

        {/* Photo upload */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Photo (optional)
          </label>
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Catch preview"
                className="h-32 w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background py-4 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Camera size={18} />
              <span>Add a photo of your catch</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        {/* Privacy Settings */}
        <div className="sm:col-span-2 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Sharing</p>
          
          {/* Public/Private Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
                isPublic
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              <Globe size={12} />
              Public
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
                !isPublic
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              <Lock size={12} />
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
                className="h-3.5 w-3.5 rounded border-border bg-background text-primary focus:ring-primary"
              />
              <span className="text-[11px] text-muted-foreground">Hide exact location</span>
            </label>
          )}

          {/* Privacy Info Box */}
          <div className="rounded-lg border border-border bg-muted p-2.5 text-[10px] text-muted-foreground">
            <div className="flex items-start gap-1.5">
              <Info size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <p><span className="font-medium">Shared:</span> Species, weight, photo, general area</p>
                <p><span className="font-medium">🔒 Never shared:</span> Exact GPS / fishing spot</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="inline-flex items-center justify-center rounded-md bg-navy-800 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-navy-900 disabled:cursor-not-allowed disabled:bg-navy-400"
        >
          {isSubmitting || isUploading ? 'Logging…' : 'Log catch'}
        </button>
      </div>
    </form>
  )
}
