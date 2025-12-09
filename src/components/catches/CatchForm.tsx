import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useActiveSession } from '../../hooks/useActiveSession'
import type { Catch, CatchFormInput } from '../../types'
import { LocationPicker } from '../map/LocationPicker'
import { uploadCatchPhoto } from '../../hooks/usePhotoUpload'
import { FISH_SPECIES } from '../../lib/constants'
import { getOrCreateSessionForCatch } from '../../lib/autoSession'
import { useCatchXP } from '../../hooks/useCatchXP'
import { Globe, Lock, Info } from 'lucide-react'

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
}

export function CatchForm({ onSuccess, mode = 'create', catchId, initialCatch }: CatchFormProps) {
  const { user } = useAuth()
  const { data: activeSession } = useActiveSession()
  const catchXP = useCatchXP()
  
  // Check if a specific session is requested via URL parameter
  const searchParams = new URLSearchParams(window.location.search)
  const requestedSessionId = searchParams.get('session')
  
  // Use requested session if provided, otherwise fall back to active session
  const targetSessionId = requestedSessionId || activeSession?.id
  
  // Debug logging
  console.log('CatchForm - URL params:', window.location.search)
  console.log('CatchForm - requestedSessionId:', requestedSessionId)
  console.log('CatchForm - activeSession?.id:', activeSession?.id)
  console.log('CatchForm - targetSessionId:', targetSessionId)
  const [formError, setFormError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isPublic, setIsPublic] = useState(true)
  const [hideExactLocation, setHideExactLocation] = useState(false)

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
        // When creating a brand new catch, prefill from active session if available
        location_name: activeSession?.location_name ?? undefined,
        latitude:
          activeSession?.latitude != null && !Number.isNaN(activeSession.latitude)
            ? activeSession.latitude.toString()
            : undefined,
        longitude:
          activeSession?.longitude != null && !Number.isNaN(activeSession.longitude)
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

    // Get mark_id from the session if one exists
    let markId: string | null = null
    if (sessionId) {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('mark_id')
        .eq('id', sessionId)
        .single()
      markId = sessionData?.mark_id ?? null
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
      })
    } else {
      toast.success(isEdit ? 'Catch updated' : 'Catch added')
    }
    
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {formError ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {formError}
        </div>
      ) : null}

      {mode === 'create' && activeSession ? (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
          This catch will be added to your active session:{' '}
          <span className="font-semibold">{activeSession.title || activeSession.location_name}</span>.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="species">
            Species
          </label>
          <select
            id="species"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('species')}
          >
            <option value="">Select species</option>
            <optgroup label="Saltwater">
              {FISH_SPECIES.SALTWATER.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </optgroup>
            <optgroup label="Coarse">
              {FISH_SPECIES.COARSE.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </optgroup>
            <optgroup label="Game">
              {FISH_SPECIES.GAME.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </optgroup>
            <option value="Other">Other / not listed</option>
          </select>
          {errors.species ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.species.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="caught_at">
            Date & time
          </label>
          <input
            id="caught_at"
            type="datetime-local"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('caught_at')}
          />
          {errors.caught_at ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.caught_at.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="location_name">
            Location name
          </label>
          <input
            id="location_name"
            type="text"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g. Chesil Beach, Dorset"
            {...register('location_name')}
          />
          {errors.location_name ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.location_name.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-700">Pick location on map</p>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
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
          <p className="mt-1 text-[11px] text-slate-500">
            Tap or drag the pin to your fishing spot. Coordinates are saved automatically.
          </p>
          {errors.latitude ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.latitude.message}</p>
          ) : null}
          {errors.longitude ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.longitude.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="photo">
            Photo (optional)
          </label>
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-[11px] text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-slate-700 hover:file:bg-slate-100"
            onChange={(e) => {
              const file = e.target.files?.[0]
              setPhotoFile(file ?? null)
            }}
          />
          {photoFile ? (
            <div className="mt-1 inline-flex items-center gap-2">
              <span className="text-[11px] text-slate-600">Selected:</span>
              <span className="truncate text-[11px] text-slate-700 max-w-[160px]">
                {photoFile.name}
              </span>
            </div>
          ) : null}
          <p className="mt-1 text-[11px] text-slate-500">JPG, PNG, or WebP up to 5MB.</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="weight_kg">
            Weight (kg)
          </label>
          <input
            id="weight_kg"
            type="number"
            inputMode="decimal"
            step="0.01"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('weight_kg')}
          />
          {errors.weight_kg ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.weight_kg.message as string}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="length_cm">
            Length (cm)
          </label>
          <input
            id="length_cm"
            type="number"
            inputMode="decimal"
            step="0.1"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('length_cm')}
          />
          {errors.length_cm ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.length_cm.message as string}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="bait">
            Bait
          </label>
          <input
            id="bait"
            type="text"
            placeholder="e.g. lugworm, ragworm, squid"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('bait')}
          />
          {errors.bait ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.bait.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="rig">
            Rig
          </label>
          <input
            id="rig"
            type="text"
            placeholder="e.g. running ledger, paternoster"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('rig')}
          />
          {errors.rig ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.rig.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="fishing_style">
            Fishing style
          </label>
          <select
            id="fishing_style"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            className="block w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Conditions, tactics, who you were fishing with, etc."
            {...register('notes')}
          />
          {errors.notes ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.notes.message}</p>
          ) : null}
        </div>

        {/* Privacy Settings */}
        <div className="sm:col-span-2 space-y-3">
          <p className="text-xs font-medium text-slate-700">Sharing</p>
          
          {/* Public/Private Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                isPublic
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-xs text-slate-600">Hide exact location (show region only)</span>
            </label>
          )}

          {/* Privacy Info Box */}
          <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
            <div className="flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="space-y-1.5">
                <p className="font-medium text-slate-700">What's shared publicly?</p>
                <ul className="space-y-0.5 text-slate-500">
                  <li>• Species, weight, and photo</li>
                  <li>• General area (e.g. "Cornwall")</li>
                  <li>• Date caught</li>
                </ul>
                <p className="font-medium text-slate-700 pt-1">🔒 Never shared:</p>
                <ul className="space-y-0.5 text-slate-500">
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
