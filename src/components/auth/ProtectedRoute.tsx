import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { ResponsiveLayout } from '../../components/layout/ResponsiveLayout'
import { FishingPreferenceModal } from '../onboarding/FishingPreferenceModal'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const { data: profile, isLoading: profileLoading, refetch } = useProfile()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // Show onboarding if user has no fishing preference set
    if (profile && !profile.fishing_preference) {
      setShowOnboarding(true)
    }
  }, [profile])

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-slate-600">Checking session…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    refetch() // Refresh profile data
  }

  return (
    <ResponsiveLayout>
      <Outlet />
      {showOnboarding && <FishingPreferenceModal onComplete={handleOnboardingComplete} />}
    </ResponsiveLayout>
  )
}
