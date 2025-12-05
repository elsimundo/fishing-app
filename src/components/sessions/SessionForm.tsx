import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { LocationPicker } from '../map/LocationPicker'
import { WATER_TYPES, LOCATION_PRIVACY_OPTIONS, TIDE_STATES } from '../../lib/constants'
import type { SessionFormData, Session } from '../../types'
import { useCreateSession } from '../../hooks/useCreateSession'

const sessionFormSchema = z.object({
  title: z.string().max(80).optional(),
  location_name: z.string().min(1, 'Location is required'),
  latitude: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => !Number.isNaN(val), { message: 'Latitude must be a number' }),
  longitude: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => !Number.isNaN(val), { message: 'Longitude must be a number' }),
  water_type: z.string().optional(),
  is_public: z.boolean().default(false),
  location_privacy: z.enum(['private', 'general', 'exact']).default('private'),
  started_at: z.string().min(1, 'Start time is required'),
  ended_at: z.string().optional(),
  session_notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional(),
  cover_photo_url: z.string().url().optional().or(z.literal('')),
  tide_state: z.string().optional(),
})

export type SessionFormValues = z.infer<typeof sessionFormSchema>

type SessionFormProps = {
  onSuccess?: (session: Session) => void
}

export function SessionForm({ onSuccess }: SessionFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useCreateSession()

  const defaultNow = new Date().toISOString().slice(0, 16)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      started_at: defaultNow,
      is_public: false,
      location_privacy: 'private',
    },
  })

  const watchedLat = watch('latitude')
  const watchedLng = watch('longitude')

  const latNumber =
    watchedLat === undefined || watchedLat === null || watchedLat === '' ? null : Number(watchedLat)
  const lngNumber =
    watchedLng === undefined || watchedLng === null || watchedLng === '' ? null : Number(watchedLng)

  const pickerValue = {
    lat: Number.isNaN(latNumber ?? NaN) ? null : latNumber,
    lng: Number.isNaN(lngNumber ?? NaN) ? null : lngNumber,
  }

  const onSubmit = async (values: SessionFormValues) => {
    setFormError(null)

    const payload: SessionFormData = {
      title: values.title || undefined,
      location_name: values.location_name,
      latitude: values.latitude,
      longitude: values.longitude,
      water_type: values.water_type as SessionFormData['water_type'],
      is_public: values.is_public,
      location_privacy: values.location_privacy,
      started_at: new Date(values.started_at).toISOString(),
      ended_at: values.ended_at ? new Date(values.ended_at).toISOString() : undefined,
      session_notes: values.session_notes || undefined,
      cover_photo_url: values.cover_photo_url || undefined,
      tide_state: values.tide_state || undefined,
    }

    try {
      const session = await mutateAsync(payload)
      toast.success('Session started')
      onSuccess?.(session)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save session.'
      setFormError(message)
      toast.error(message)
    }
  }

  // Common input classes for large touch targets
  const inputClass = "block w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-base shadow-sm focus:border-navy-800 focus:outline-none focus:ring-0 min-h-[56px]"
  const selectClass = "block w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-base shadow-sm focus:border-navy-800 focus:outline-none focus:ring-0 min-h-[56px] appearance-none bg-white"
  const labelClass = "mb-2 block text-sm font-semibold text-slate-700"
  const errorClass = "mt-2 text-sm text-red-600 font-medium"

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {formError ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">{formError}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="title">
            Session title (optional)
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Morning bass hunt"
            className={inputClass}
            {...register('title')}
          />
          {errors.title ? (
            <p className={errorClass}>{errors.title.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="location_name">
            Location name *
          </label>
          <input
            id="location_name"
            type="text"
            placeholder="e.g. Southend Pier"
            className={inputClass}
            {...register('location_name')}
          />
          {errors.location_name ? (
            <p className={errorClass}>{errors.location_name.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="water_type">
            Water type
          </label>
          <select
            id="water_type"
            className={selectClass}
            {...register('water_type')}
          >
            <option value="">Select water type</option>
            {WATER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="started_at">
            Start time *
          </label>
          <input
            id="started_at"
            type="datetime-local"
            className={inputClass}
            {...register('started_at')}
          />
          {errors.started_at ? (
            <p className={errorClass}>{errors.started_at.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Pick session location</p>
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

          {errors.latitude ? (
            <p className={errorClass}>{errors.latitude.message}</p>
          ) : null}
          {errors.longitude ? (
            <p className={errorClass}>{errors.longitude.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Location privacy</p>
          <div className="space-y-2">
            {LOCATION_PRIVACY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 px-4 py-4 text-sm hover:bg-slate-50 active:bg-slate-100 min-h-[64px]"
              >
                <input
                  type="radio"
                  value={opt.value}
                  className="mt-1 h-5 w-5"
                  {...register('location_privacy')}
                />
                <span>
                  <span className="block font-semibold text-slate-800">{opt.label}</span>
                  <span className="text-slate-500 text-sm">{opt.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="tide_state">
            Tide (optional)
          </label>
          <select
            id="tide_state"
            className={selectClass}
            {...register('tide_state')}
          >
            <option value="">Not set</option>
            {TIDE_STATES.map((tide) => (
              <option key={tide} value={tide}>
                {tide}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Visibility</label>
          <label className="flex items-center gap-3 rounded-xl border-2 border-slate-200 px-4 py-4 text-sm cursor-pointer hover:bg-slate-50 active:bg-slate-100 min-h-[56px]">
            <input type="checkbox" className="h-5 w-5" {...register('is_public')} />
            <span className="font-medium text-slate-700">Make this session public</span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="session_notes">
            Session notes (optional)
          </label>
          <textarea
            id="session_notes"
            rows={4}
            className="block w-full resize-none rounded-xl border-2 border-slate-200 px-4 py-4 text-base shadow-sm focus:border-navy-800 focus:outline-none focus:ring-0"
            placeholder="Plans, conditions, tactics"
            {...register('session_notes')}
          />
          {errors.session_notes ? (
            <p className={errorClass}>{errors.session_notes.message}</p>
          ) : null}
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-navy-800 px-6 py-5 text-lg font-semibold text-white shadow-lg hover:bg-navy-900 disabled:bg-navy-400 active:scale-[0.98] transition-all min-h-[64px]"
        >
          {isPending ? 'Starting…' : '🎣 Start session'}
        </button>
      </div>
    </form>
  )
}
