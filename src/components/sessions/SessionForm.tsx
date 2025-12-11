import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { LocationPicker } from '../map/LocationPicker'
import { WATER_TYPES, LOCATION_PRIVACY_OPTIONS, TIDE_STATES } from '../../lib/constants'
import type { SessionFormData, Session } from '../../types'
import { useCreateSession } from '../../hooks/useCreateSession'
import { getCompleteWeatherData } from '../../services/open-meteo'
import { getTideData } from '../../services/tides'
import { WEATHER_CODES } from '../../types/weather'
import { getMoonPhase } from '../../utils/moonPhase'

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
  location_privacy: z.enum(['private', 'general', 'exact']).default('general'),
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
      location_privacy: 'general',
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

    // Fetch weather and tide snapshot (non-blocking errors)
    let weatherTemp: number | null = null
    let weatherCondition: string | null = null
    let windSpeed: number | null = null
    let tideState: string | undefined = values.tide_state || undefined

    try {
      const [weatherData, tideData] = await Promise.all([
        getCompleteWeatherData(values.latitude, values.longitude).catch(() => null),
        getTideData(values.latitude, values.longitude).catch(() => null),
      ])

      if (weatherData?.current) {
        weatherTemp = weatherData.current.temperature
        windSpeed = weatherData.current.windSpeed
        const code = weatherData.current.weatherCode
        weatherCondition = WEATHER_CODES[code]?.description || null
      }

      // Only use tide data if user didn't manually select a tide state
      if (!tideState && tideData?.current?.type) {
        // Capitalize first letter: "rising" -> "Rising"
        const t = tideData.current.type
        tideState = t.charAt(0).toUpperCase() + t.slice(1)
      }
    } catch (e) {
      console.warn('[SessionForm] Failed to fetch weather/tide snapshot:', e)
    }

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
      tide_state: tideState as SessionFormData['tide_state'],
      weather_temp: weatherTemp,
      weather_condition: weatherCondition,
      wind_speed: windSpeed,
      moon_phase: getMoonPhase().phase,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {formError ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="title">
            Session title (optional)
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Morning bass hunt"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('title')}
          />
          {errors.title ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.title.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="location_name">
            Location name
          </label>
          <input
            id="location_name"
            type="text"
            placeholder="e.g. Southend Pier"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('location_name')}
          />
          {errors.location_name ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.location_name.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="water_type">
            Water type
          </label>
          <select
            id="water_type"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="started_at">
            Start time
          </label>
          <input
            id="started_at"
            type="datetime-local"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('started_at')}
          />
          {errors.started_at ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.started_at.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-700">Pick session location</p>
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

          {errors.latitude ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.latitude.message}</p>
          ) : null}
          {errors.longitude ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.longitude.message}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2 space-y-2">
          <p className="text-[11px] font-medium text-slate-700">Location privacy</p>
          <div className="space-y-1">
            {LOCATION_PRIVACY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 px-2 py-2 text-[11px] hover:bg-slate-50"
              >
                <input
                  type="radio"
                  value={opt.value}
                  className="mt-[3px] h-3 w-3"
                  {...register('location_privacy')}
                />
                <span>
                  <span className="block font-medium">{opt.label}</span>
                  <span className="text-slate-500">{opt.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="tide_state">
            Tide (optional)
          </label>
          <select
            id="tide_state"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
          <label className="mb-1 block text-xs font-medium text-slate-700">Visibility</label>
          <label className="inline-flex items-center gap-2 text-[11px] text-slate-700">
            <input type="checkbox" className="h-3 w-3" {...register('is_public')} />
            <span>Make this session public (future social features)</span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="session_notes">
            Session notes (optional)
          </label>
          <textarea
            id="session_notes"
            rows={3}
            className="block w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Plans, conditions, tactics for this trip"
            {...register('session_notes')}
          />
          {errors.session_notes ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.session_notes.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-70"
        >
          {isPending ? 'Saving…' : 'Start session'}
        </button>
      </div>
    </form>
  )
}
