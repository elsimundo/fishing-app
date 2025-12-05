import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types'

interface EditProfileModalProps {
  profile: Profile
  onClose: () => void
  onSuccess: () => void
}

export function EditProfileModal({ profile, onClose, onSuccess }: EditProfileModalProps) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [location, setLocation] = useState(profile.location ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
        })
        .eq('id', profile.id)

      if (error) throw error

      onSuccess()
    } catch (error) {
      console.error('Error updating profile', error)
      window.alert('Failed to update profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const inputClass = "w-full rounded-xl border-2 border-gray-200 px-4 py-4 text-base focus:border-navy-800 focus:outline-none focus:ring-0 min-h-[56px]"
  const labelClass = "mb-2 block text-sm font-semibold text-gray-900"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
      <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-3 transition-colors hover:bg-gray-100 active:bg-gray-200 min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <label className={labelClass}>Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={200}
              className="w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-4 text-base focus:border-navy-800 focus:outline-none focus:ring-0"
              placeholder="Tell others about yourself…"
            />
            <p className="mt-2 text-right text-sm text-gray-500">{bio.length}/200</p>
          </div>

          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
              className={inputClass}
              placeholder="e.g. Brighton, UK"
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-5 py-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-gray-300 px-4 py-4 text-base font-semibold text-gray-700 transition-all hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] min-h-[56px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-4 text-base font-semibold text-white transition-all hover:bg-navy-900 active:scale-[0.98] disabled:bg-navy-400 min-h-[56px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
