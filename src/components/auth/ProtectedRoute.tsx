import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { ResponsiveLayout } from '../../components/layout/ResponsiveLayout'
import { FishingPreferenceModal } from '../onboarding/FishingPreferenceModal'
import { DefaultLocationModal } from '../onboarding/DefaultLocationModal'
import { ZombieSessionChecker } from '../sessions/ZombieSessionChecker'

type OnboardingStep = 'fishing_preference' | 'default_location' | null

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const { data: profile, isLoading: profileLoading, refetch } = useProfile()
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(null)

  useEffect(() => {
    if (!profile) return

    // Step 1: Fishing preference
    if (!profile.fishing_preference) {
      setOnboardingStep('fishing_preference')
      return
    }

    // Step 2: Default location
    if (profile.default_latitude == null || profile.default_longitude == null) {
      setOnboardingStep('default_location')
      return
    }

    // All onboarding complete
    setOnboardingStep(null)
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

  const handleFishingPreferenceComplete = () => {
    refetch() // This will trigger the useEffect to check for next step
  }

  const handleLocationComplete = () => {
    setOnboardingStep(null)
    refetch()
  }

  return (
    <ResponsiveLayout>
      <Outlet />
      {onboardingStep === 'fishing_preference' && (
        <FishingPreferenceModal onComplete={handleFishingPreferenceComplete} />
      )}
      {onboardingStep === 'default_location' && (
        <DefaultLocationModal onComplete={handleLocationComplete} />
      )}
      {/* Check for stale/zombie sessions and prompt user to end them */}
      {!onboardingStep && <ZombieSessionChecker />}
    </ResponsiveLayout>
  )
}
