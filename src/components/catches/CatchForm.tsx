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

    const payload: CatchFormInput & { user_id: string } = {
      user_id: user.id,
      species: values.species,
      caught_at: new Date(values.caught_at).toISOString(),
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
      // Attach to requested session (from URL) or active session if creating a new catch
      session_id: mode === 'create' && !catchId ? targetSessionId : undefined,
    }

    console.log('CatchForm - Submitting payload with session_id:', payload.session_id)
    console.log('CatchForm - Full payload:', payload)

    const isEdit = mode === 'edit' && catchId

    const { error } = isEdit
      ? await supabase.from('catches').update(payload).eq('id', catchId)
      : await supabase.from('catches').insert(payload)

    if (error) {
      setFormError(error.message)
      toast.error(error.message)
      return
    }

    toast.success(isEdit ? 'Catch updated' : 'Catch added')
    onSuccess()
  }

  // Common input classes for large touch targets
  const inputClass = "block w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-base shadow-sm focus:border-navy-800 focus:outline-none focus:ring-0 min-h-[56px]"
  const selectClass = "block w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-base shadow-sm focus:border-navy-800 focus:outline-none focus:ring-0 min-h-[56px] appearance-none bg-white"
  const labelClass = "mb-2 block text-sm font-semibold text-slate-700"
  const errorClass = "mt-2 text-sm text-red-600 font-medium"

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {formError ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
          {formError}
        </div>
      ) : null}

      {mode === 'create' && activeSession ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          This catch will be added to your active session:{' '}
          <span className="font-semibold">{activeSession.title || activeSession.location_name}</span>.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="species">
            Species *
          </label>
          <select
            id="species"
            className={selectClass}
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
            <p className={errorClass}>{errors.species.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="caught_at">
            Date & time *
          </label>
          <input
            id="caught_at"
            type="datetime-local"
            className={inputClass}
            {...register('caught_at')}
          />
          {errors.caught_at ? (
            <p className={errorClass}>{errors.caught_at.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="location_name">
            Location name *
          </label>
          <input
            id="location_name"
            type="text"
            className={inputClass}
            placeholder="e.g. Chesil Beach, Dorset"
            {...register('location_name')}
          />
          {errors.location_name ? (
            <p className={errorClass}>{errors.location_name.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Pick location on map</p>
            <button
              type="button"
              className="rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 min-h-[48px]"
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
              📍 Use my location
            </button>
          </div>

          <LocationPicker
            value={pickerValue}
            onChange={({ lat, lng }) => {
              setValue('latitude', lat.toString(), { shouldValidate: true })
              setValue('longitude', lng.toString(), { shouldValidate: true })
            }}
          />
          <p className="text-sm text-slate-500">
            Tap or drag the pin to your fishing spot.
          </p>
          {errors.latitude ? (
            <p className={errorClass}>{errors.latitude.message}</p>
          ) : null}
          {errors.longitude ? (
            <p className={errorClass}>{errors.longitude.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2 space-y-3">
          <label className={labelClass} htmlFor="photo">
            Photo (optional)
          </label>
          <label
            htmlFor="photo"
            className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-base font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 active:bg-slate-200 min-h-[80px]"
          >
            📷 {photoFile ? 'Change photo' : 'Add photo'}
          </label>
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              setPhotoFile(file ?? null)
            }}
          />
          {photoFile ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3">
              <span className="text-sm text-emerald-700">✓ Selected:</span>
              <span className="truncate text-sm font-medium text-emerald-800 max-w-[200px]">
                {photoFile.name}
              </span>
            </div>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="weight_kg">
            Weight (kg)
          </label>
          <input
            id="weight_kg"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            className={inputClass}
            {...register('weight_kg')}
          />
          {errors.weight_kg ? (
            <p className={errorClass}>{errors.weight_kg.message as string}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="length_cm">
            Length (cm)
          </label>
          <input
            id="length_cm"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="0.0"
            className={inputClass}
            {...register('length_cm')}
          />
          {errors.length_cm ? (
            <p className={errorClass}>{errors.length_cm.message as string}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="bait">
            Bait
          </label>
          <input
            id="bait"
            type="text"
            placeholder="e.g. lugworm, ragworm"
            className={inputClass}
            {...register('bait')}
          />
          {errors.bait ? (
            <p className={errorClass}>{errors.bait.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="rig">
            Rig
          </label>
          <input
            id="rig"
            type="text"
            placeholder="e.g. running ledger"
            className={inputClass}
            {...register('rig')}
          />
          {errors.rig ? (
            <p className={errorClass}>{errors.rig.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="fishing_style">
            Fishing style
          </label>
          <select
            id="fishing_style"
            className={selectClass}
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
            <p className={errorClass}>{errors.fishing_style.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            rows={4}
            className="block w-full resize-none rounded-xl border-2 border-slate-200 px-4 py-4 text-base shadow-sm focus:border-navy-800 focus:outline-none focus:ring-0"
            placeholder="Conditions, tactics, etc."
            {...register('notes')}
          />
          {errors.notes ? (
            <p className={errorClass}>{errors.notes.message}</p>
          ) : null}
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-navy-800 px-6 py-5 text-lg font-semibold text-white shadow-lg hover:bg-navy-900 disabled:bg-navy-400 active:scale-[0.98] transition-all min-h-[64px]"
        >
          {isSubmitting ? 'Saving…' : '🐟 Save catch'}
        </button>
      </div>
    </form>
  )
}
