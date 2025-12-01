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
      // Attach to active session if creating a new catch and one exists
      session_id: mode === 'create' && !catchId && activeSession ? activeSession.id : undefined,
    }

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
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-70"
        >
          {isSubmitting ? 'Saving…' : 'Save catch'}
        </button>
      </div>
    </form>
  )
}
