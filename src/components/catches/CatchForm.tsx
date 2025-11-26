import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { CatchFormInput } from '../../types'
import { LocationPicker } from '../map/LocationPicker'

const speciesOptions = [
  'Bass',
  'Cod',
  'Mackerel',
  'Pollock',
  'Wrasse',
  'Plaice',
  'Sole',
  'Dogfish',
  'Other',
] as const

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
}

export function CatchForm({ onSuccess }: CatchFormProps) {
  const { user } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CatchFormValues>({
    resolver: zodResolver(catchFormSchema),
    defaultValues: {
      caught_at: new Date().toISOString().slice(0, 16),
    },
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
      return
    }

    setFormError(null)

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
      notes: values.notes ?? null,
    }

    const { error } = await supabase.from('catches').insert(payload)

    if (error) {
      setFormError(error.message)
      return
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
            {speciesOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
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

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="weight_kg">
            Weight (kg)
          </label>
          <input
            id="weight_kg"
            type="text"
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
            type="text"
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
