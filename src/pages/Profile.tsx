import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'

export function Profile() {
  const { data: profile, isLoading, isError, error } = useProfile()
  const [email, setEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (profile?.email != null) {
      setEmail(profile.email)
    }
  }, [profile?.email])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-slate-600">Loading profile</p>
        </div>
      </main>
    )
  }

  if (isError || !profile) {
    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <div className="flex h-full items-center justify-center">
          <div className="max-w-xs rounded-md bg-red-50 px-3 py-2 text-center text-xs text-red-700">
            <p className="font-medium">Failed to load profile.</p>
            <p className="mt-1 text-[11px] text-red-600">
              {error instanceof Error ? error.message : 'Please try again in a moment.'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const memberSince = profile.created_at
    ? format(new Date(profile.created_at), 'd MMM yyyy')
    : null

  const initials = (profile.full_name || profile.username || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)

  return (
    <main className="min-h-screen bg-background px-4 py-4">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <Link to="/dashboard" className="text-secondary hover:underline">
            ← Back to dashboard
          </Link>
        </div>

        <header className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="space-y-1 text-xs text-slate-700">
            <p className="text-sm font-semibold text-slate-900">{profile.username || 'Unnamed angler'}</p>
            {profile.full_name && <p>{profile.full_name}</p>}
            {memberSince && <p className="text-[11px] text-slate-500">Member since {memberSince}</p>}
          </div>
        </header>

        <section className="rounded-xl bg-surface p-4 text-xs text-slate-700 shadow">
          <h2 className="mb-3 text-xs font-semibold text-slate-800">Account</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-[11px] font-medium text-slate-500">Username</dt>
              <dd>{profile.username || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-500">Full name</dt>
              <dd>{profile.full_name || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-500">Email for sharing</dt>
              <dd className="mt-1">
                <form
                  className="flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setSaveError(null)
                    setSaveSuccess(false)
                    setIsSaving(true)
                    try {
                      const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ email: email || null })
                        .eq('id', profile.id)
                      if (updateError) throw new Error(updateError.message)
                      setSaveSuccess(true)
                    } catch (err) {
                      const message = err instanceof Error ? err.message : 'Failed to save email.'
                      setSaveError(message)
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                </form>
                {saveError ? (
                  <p className="mt-1 text-[11px] text-red-600">{saveError}</p>
                ) : null}
                {!saveError && saveSuccess ? (
                  <p className="mt-1 text-[11px] text-emerald-600">Saved.</p>
                ) : null}
                {!profile.email && !saveError ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Optional: set an email so friends can find you when sharing sessions.
                  </p>
                ) : null}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl bg-surface p-4 text-xs text-slate-700 shadow">
          <h2 className="mb-3 text-xs font-semibold text-slate-800">Preferences</h2>
          <p className="text-[11px] text-slate-500">Unit preferences and notifications coming in a future update.</p>
        </section>
      </div>
    </main>
  )
}
