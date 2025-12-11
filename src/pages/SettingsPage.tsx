import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { FishingPreferenceModal } from '../components/onboarding/FishingPreferenceModal'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { LOCATION_PRIVACY_OPTIONS } from '../lib/constants'

export default function SettingsPage() {
  const { user } = useAuth()
  const { data: profile, refetch: refetchProfile } = useProfile()
  const [showFishingPrefs, setShowFishingPrefs] = useState(false)
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false)

  type IdlePrefs = {
    // All values are in HOURS in the UI/storage
    seaWarn: number
    seaEnd: number
    lakeWarn: number
    lakeEnd: number
    riverWarn: number
    riverEnd: number
  }

  const [idlePrefs, setIdlePrefs] = useState<IdlePrefs | null>(null)

  // Load idle preferences from localStorage (placeholder until wired to Supabase profile)
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('idle_session_prefs') : null
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<IdlePrefs>
        // Backwards-compat: if old values were stored in minutes, convert to hours
        const toHours = (value: number | undefined, fallback: number) => {
          if (value == null) return fallback
          // Heuristic: anything above 24 is almost certainly minutes
          return value > 24 ? value / 60 : value
        }
        setIdlePrefs({
          seaWarn: toHours(parsed.seaWarn, 4),
          seaEnd: toHours(parsed.seaEnd, 6),
          lakeWarn: toHours(parsed.lakeWarn, 2),
          lakeEnd: toHours(parsed.lakeEnd, 4),
          riverWarn: toHours(parsed.riverWarn, 1.5),
          riverEnd: toHours(parsed.riverEnd, 3),
        })
        return
      } catch {
        // fall through to defaults
      }
    }

    setIdlePrefs({
      seaWarn: 4,
      seaEnd: 6,
      lakeWarn: 2,
      lakeEnd: 4,
      riverWarn: 1.5,
      riverEnd: 3,
    })
  }, [])

  const updateIdlePref = (key: keyof IdlePrefs, value: number) => {
    setIdlePrefs((prev) => {
      const next = {
        seaWarn: 4,
        seaEnd: 6,
        lakeWarn: 2,
        lakeEnd: 4,
        riverWarn: 1.5,
        riverEnd: 3,
        ...(prev ?? {}),
        [key]: value,
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('idle_session_prefs', JSON.stringify(next))
      }

      return next
    })
  }

  const updateDataSharing = async (shareData: boolean) => {
    if (!user) return
    
    setIsSavingPrivacy(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ share_data_for_insights: shareData })
        .eq('id', user.id)

      if (error) throw error

      await refetchProfile()
      toast.success(shareData ? 'Data sharing enabled' : 'Data sharing disabled')
    } catch (error) {
      console.error('Failed to update data sharing:', error)
      toast.error('Failed to update privacy settings')
    } finally {
      setIsSavingPrivacy(false)
    }
  }

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
        {/* Idle session settings */}
        {idlePrefs && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Session idle time</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Control how long we keep a session running with no activity before warning you and then
                  automatically ending it. Times are in <span className="font-semibold">hours</span>. We&apos;ll use
                  sensible defaults if you leave these alone.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-700">
              {/* Sea / saltwater */}
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
                <div>
                  <p className="font-semibold text-gray-900">Sea / Boat / Beach</p>
                  <p className="text-[11px] text-gray-500">Longer sessions, slower logging.</p>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">Warn after (hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    step={0.5}
                    value={idlePrefs.seaWarn}
                    onChange={(e) => updateIdlePref('seaWarn', Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">Auto-end after (hours)</label>
                  <input
                    type="number"
                    min={2}
                    max={24}
                    step={0.5}
                    value={idlePrefs.seaEnd}
                    onChange={(e) => updateIdlePref('seaEnd', Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
                  />
                </div>
              </div>

              {/* Lakes / stillwater */}
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 border-t border-gray-100 pt-3">
                <div>
                  <p className="font-semibold text-gray-900">Lakes & stillwaters</p>
                  <p className="text-[11px] text-gray-500">Typical carp/coarse sessions.</p>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">Warn after (hours)</label>
                  <input
                    type="number"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={idlePrefs.lakeWarn}
                    onChange={(e) => updateIdlePref('lakeWarn', Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">Auto-end after (hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    step={0.5}
                    value={idlePrefs.lakeEnd}
                    onChange={(e) => updateIdlePref('lakeEnd', Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
                  />
                </div>
              </div>

              {/* Rivers / canals */}
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 border-t border-gray-100 pt-3">
                <div>
                  <p className="font-semibold text-gray-900">Rivers & canals</p>
                  <p className="text-[11px] text-gray-500">Usually shorter mobile sessions.</p>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">Warn after (hours)</label>
                  <input
                    type="number"
                    min={0.25}
                    max={12}
                    step={0.25}
                    value={idlePrefs.riverWarn}
                    onChange={(e) => updateIdlePref('riverWarn', Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">Auto-end after (hours)</label>
                  <input
                    type="number"
                    min={0.5}
                    max={24}
                    step={0.25}
                    value={idlePrefs.riverEnd}
                    onChange={(e) => updateIdlePref('riverEnd', Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
                  />
                </div>
              </div>

              <p className="mt-2 text-[11px] text-gray-500">
                We&apos;ll store these on this device for now. Later we can sync them to your account so they follow
                you everywhere.
              </p>
            </div>
          </section>
        )}

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

        {/* Privacy & Data Sharing */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Privacy & Data Sharing</h2>
            <p className="mt-1 text-xs text-gray-500">
              Control how your fishing data is used and displayed.
            </p>
          </div>

          {/* Default Location Privacy */}
          <div className="mb-4 rounded-lg border border-gray-200 p-3">
            <h3 className="text-xs font-semibold text-gray-900 mb-2">Default Location Privacy</h3>
            <p className="text-xs text-gray-600 mb-3">
              This controls how your session locations appear on the map. You can change this per-session when creating it.
            </p>
            <div className="space-y-2">
              {LOCATION_PRIVACY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-start gap-2">
                  <div className="flex h-5 items-center">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-gray-300">
                      {option.value === 'general' && (
                        <div className="h-2 w-2 rounded-full bg-navy-800" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-900">{option.label}</p>
                    <p className="text-[11px] text-gray-500">{option.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-blue-600 bg-blue-50 rounded-lg p-2">
              💡 <strong>Recommended:</strong> General area protects your secret spots while still contributing to community insights.
            </p>
          </div>

          {/* Data Sharing Toggle */}
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-gray-900">Community Data Sharing</h3>
                <p className="mt-1 text-xs text-gray-600">
                  Help other anglers by contributing anonymized data to Local Intel and fishing insights. Your exact locations are never shared - only aggregated stats like species caught, baits used, and best times.
                </p>
                <p className="mt-2 text-[11px] text-gray-500">
                  <strong>What's shared:</strong> Species, baits, catch times, weather conditions (all anonymized)
                  <br />
                  <strong>What's NOT shared:</strong> Your exact locations, personal info, or session details
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateDataSharing(!(profile?.share_data_for_insights ?? true))}
                disabled={isSavingPrivacy}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-navy-800 focus:ring-offset-2 ${
                  profile?.share_data_for_insights ?? true ? 'bg-navy-800' : 'bg-gray-200'
                } ${isSavingPrivacy ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    profile?.share_data_for_insights ?? true ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="mt-3 text-[11px] text-emerald-600 bg-emerald-50 rounded-lg p-2">
              ✅ <strong>Currently {profile?.share_data_for_insights ?? true ? 'enabled' : 'disabled'}:</strong> {profile?.share_data_for_insights ?? true ? 'Your anonymized data helps the community' : 'Your data is completely private'}
            </p>
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
