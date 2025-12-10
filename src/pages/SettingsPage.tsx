import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { FishingPreferenceModal } from '../components/onboarding/FishingPreferenceModal'

export default function SettingsPage() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const [showFishingPrefs, setShowFishingPrefs] = useState(false)

  if (!user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading settings…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-5 py-4">
        <h1 className="text-xl font-bold text-gray-900">Settings & Preferences</h1>
        <p className="mt-1 text-sm text-gray-500">Control how the app works for you.</p>
      </div>

      <main className="mx-auto max-w-3xl px-5 py-6 space-y-4">
        {/* Fishing style */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Fishing style</h2>
              <p className="mt-1 text-xs text-gray-500">
                Tell us what kind of fishing you do most so we can tune sessions, challenges, and recommendations.
              </p>
              {profile.fishing_preference && (
                <p className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  Current: {profile.fishing_preference === 'sea' ? 'Sea fishing' : profile.fishing_preference === 'freshwater' ? 'Freshwater' : 'All fishing'}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowFishingPrefs(true)}
              className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-900"
            >
              Choose style
            </button>
          </div>
        </section>

        {/* Account settings placeholder */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Account</h2>
          <p className="mt-1 text-xs text-gray-500">
            Email: <span className="font-medium text-gray-800">{user.email}</span>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            More account controls (password, deletion, etc.) will live here.
          </p>
        </section>
      </main>

      {showFishingPrefs && (
        <FishingPreferenceModal
          onComplete={() => {
            setShowFishingPrefs(false)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
