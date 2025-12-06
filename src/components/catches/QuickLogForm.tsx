import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import type { Catch, Session } from '../../types'
import { FISH_SPECIES } from '../../lib/constants'
import { Camera, X } from 'lucide-react'

const quickLogSchema = z.object({
  species: z.string().min(1, 'Species is required'),
  caught_at: z.string().min(1, 'Time is required'),
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
  notes: z
    .string()
    .max(200, 'Notes must be 200 characters or less')
    .optional()
    .transform((val) => (val === '' ? null : val)),
})

export type QuickLogValues = z.infer<typeof quickLogSchema>

type QuickLogFormProps = {
  session: Session
  onLogged: (catchItem: Catch) => void
  onClose: () => void
}

export function QuickLogForm({ session, onLogged, onClose }: QuickLogFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const defaultNow = new Date().toISOString().slice(0, 16)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
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
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `catches/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('catches')
        .upload(filePath, photoFile)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('catches').getPublicUrl(filePath)
      return data.publicUrl
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
    formState: { errors, isSubmitting },
  } = useForm<QuickLogValues>({
    resolver: zodResolver(quickLogSchema),
    defaultValues: {
      caught_at: defaultNow,
    },
  })

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
      } catch {
        toast.error('Failed to upload photo')
        return
      }
    }

    const payload = {
      user_id: userData.user.id,
      session_id: session.id,
      species: values.species,
      caught_at: new Date(values.caught_at).toISOString(),
      location_name: session.location_name,
      latitude: session.latitude,
      longitude: session.longitude,
      weight_kg: values.weight_kg ?? null,
      length_cm: values.length_cm ?? null,
      bait: null,
      rig: null,
      fishing_style: null,
      photo_url: photoUrl,
      notes: values.notes ?? null,
    }

    const { data, error } = await supabase.from('catches').insert(payload).select('*').single()

    if (error || !data) {
      const message = error?.message ?? 'Failed to log catch.'
      setFormError(message)
      toast.error(message)
      return
    }

    const created = data as Catch
    toast.success('Catch logged')
    onLogged(created)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {formError ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>
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
            Time
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

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="notes">
            Quick note (optional)
          </label>
          <textarea
            id="notes"
            rows={2}
            className="block w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Rig, depth, what happened"
            {...register('notes')}
          />
          {errors.notes ? (
            <p className="mt-1 text-[11px] text-red-600">{errors.notes.message}</p>
          ) : null}
        </div>

        {/* Photo upload */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700">
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-4 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-600"
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
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="inline-flex items-center justify-center rounded-md bg-navy-800 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-navy-900 disabled:opacity-70"
        >
          {isSubmitting || isUploading ? 'Logging…' : 'Log catch'}
        </button>
      </div>
    </form>
  )
}
