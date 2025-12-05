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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
      <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-navy-800"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={200}
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-navy-800"
              placeholder="Tell others about yourself…"
            />
            <p className="mt-1 text-right text-xs text-gray-500">{bio.length}/200</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-navy-800"
              placeholder="e.g. Brighton, UK"
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-3 font-semibold text-white transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
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
