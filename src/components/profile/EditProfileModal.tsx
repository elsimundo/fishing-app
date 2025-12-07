import { useState, useRef } from 'react'
import { Loader2, X, Camera } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { compressAvatar } from '../../utils/imageCompression'
import type { Profile } from '../../types'

interface EditProfileModalProps {
  profile: Profile
  onClose: () => void
  onSuccess: () => void
}

export function EditProfileModal({ profile, onClose, onSuccess }: EditProfileModalProps) {
  const [username, setUsername] = useState(profile.username ?? '')
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatarUrl] = useState(profile.avatar_url ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validate username format
  const validateUsername = (value: string): string | null => {
    if (!value.trim()) return 'Username is required'
    if (value.length < 3) return 'Username must be at least 3 characters'
    if (value.length > 20) return 'Username must be 20 characters or less'
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Only letters, numbers, and underscores allowed'
    return null
  }

  // Check if username is available
  const checkUsernameAvailable = async (value: string): Promise<boolean> => {
    if (value.toLowerCase() === profile.username?.toLowerCase()) return true
    
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', value)
      .neq('id', profile.id)
      .limit(1)
    
    return !data || data.length === 0
  }

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(sanitized)
    setUsernameError(validateUsername(sanitized))
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 20MB before compression)
    if (file.size > 20 * 1024 * 1024) {
      alert('Image must be less than 20MB')
      return
    }

    try {
      // Compress the image
      const compressedFile = await compressAvatar(file)
      setAvatarFile(compressedFile)
      setAvatarPreview(URL.createObjectURL(compressedFile))
    } catch (error) {
      console.error('Failed to compress image:', error)
      alert('Failed to process image. Please try a different one.')
    }
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return avatarUrl || null

    setIsUploading(true)
    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      return data.publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    // Validate username
    const usernameValidation = validateUsername(username)
    if (usernameValidation) {
      setUsernameError(usernameValidation)
      return
    }

    setIsSaving(true)
    try {
      // Check username availability if changed
      if (username.toLowerCase() !== profile.username?.toLowerCase()) {
        setIsCheckingUsername(true)
        const isAvailable = await checkUsernameAvailable(username)
        setIsCheckingUsername(false)
        
        if (!isAvailable) {
          setUsernameError('Username is already taken')
          setIsSaving(false)
          return
        }
      }

      // Upload avatar if changed
      let newAvatarUrl: string | null = avatarUrl || null
      if (avatarFile) {
        newAvatarUrl = await uploadAvatar()
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          avatar_url: newAvatarUrl,
        })
        .eq('id', profile.id)

      if (error) throw error

      onSuccess()
    } catch (error: any) {
      console.error('Error updating profile', error)
      const message = error?.message || 'Failed to update profile. Please try again.'
      window.alert(message)
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
          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {avatarPreview || avatarUrl ? (
                <img
                  src={avatarPreview || avatarUrl}
                  alt="Avatar"
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-500 text-3xl font-bold text-white">
                  {profile.username?.[0]?.toUpperCase() ?? 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-white shadow-lg hover:bg-navy-900"
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">Tap to change photo</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                maxLength={20}
                className={`w-full rounded-xl border px-4 py-3 pl-8 text-sm focus:border-transparent focus:outline-none focus:ring-2 ${
                  usernameError ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-navy-800'
                }`}
                placeholder="username"
              />
              {isCheckingUsername && (
                <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
              )}
            </div>
            {usernameError && (
              <p className="mt-1 text-xs text-red-500">{usernameError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">3-20 characters, letters, numbers, underscores only</p>
          </div>

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
            disabled={isSaving || isUploading}
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
