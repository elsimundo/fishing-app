import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { ResponsiveLayout } from '../../components/layout/ResponsiveLayout'
import { DefaultLocationModal } from '../onboarding/DefaultLocationModal'
import { ZombieSessionChecker } from '../sessions/ZombieSessionChecker'
import { SessionDurationPill } from '../sessions/SessionDurationPill'
import { supabase } from '../../lib/supabase'

type OnboardingStep = 'default_location' | null

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const { data: profile, isLoading: profileLoading, refetch } = useProfile()
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(null)

  useEffect(() => {
    if (!profile || !user) return

    // Auto-set fishing preference to 'sea' if not set (sea-only launch)
    if (!profile.fishing_preference) {
      supabase
        .from('profiles')
        .update({ fishing_preference: 'sea' })
        .eq('id', user.id)
        .then(() => refetch())
      return
    }

    // Default location step
    if (profile.default_latitude == null || profile.default_longitude == null) {
      setOnboardingStep('default_location')
      return
    }

    // All onboarding complete
    setOnboardingStep(null)
  }, [profile, user, refetch])

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking session…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const handleLocationComplete = () => {
    setOnboardingStep(null)
    refetch()
  }

  return (
    <ResponsiveLayout>
      <Outlet />
      {onboardingStep === 'default_location' && (
        <DefaultLocationModal onComplete={handleLocationComplete} />
      )}
      {/* Check for stale/zombie sessions and prompt user to end them */}
      {!onboardingStep && <ZombieSessionChecker />}
      {/* Floating pill reminder for long-running sessions */}
      {!onboardingStep && <SessionDurationPill />}
    </ResponsiveLayout>
  )
}
