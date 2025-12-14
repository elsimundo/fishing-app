import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { Layout } from '../components/layout/Layout'
import { LocationPicker } from '../components/map/LocationPicker'
import { useLakes } from '../hooks/useLakes'
import { useSavedMarks, useSharedMarks } from '../hooks/useSavedMarks'
import { useUpsertSessionParticipant } from '../hooks/useSessionParticipant'
import { getCompleteWeatherData } from '../services/open-meteo'
import { getTideData } from '../services/tides'
import { WEATHER_CODES } from '../types/weather'
import { getMoonPhase } from '../utils/moonPhase'
import type { Lake } from '../types'

type WaterType = 'saltwater' | 'freshwater'
type Privacy = 'private' | 'general' | 'exact'

interface FormState {
  locationName?: string
  latitude?: number | null
  longitude?: number | null
  title: string
  waterType?: WaterType
  privacy: Privacy
  notes?: string
  lakeId?: string | null
  markId?: string | null
  isPublic?: boolean
}

export default function StartSessionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { data: profile } = useProfile()

  const isCreatingSessionRef = useRef(false)

  const [step, setStep] = useState(0) // 0 = choice, 1-4 = full setup
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null)
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const [locationCoords, setLocationCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  })
  const [locationError, setLocationError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormState>({
    title: '',
    privacy: 'general',
    latitude: null,
    longitude: null,
    lakeId: null,
    markId: null,
    isPublic: true,
  })

  // Fetch user's saved marks and shared marks for saltwater sessions
  const { marks: savedMarks, createMark } = useSavedMarks()
  const { data: sharedMarks } = useSharedMarks()
  const { mutateAsync: upsertParticipant } = useUpsertSessionParticipant()
  
  // Combine own marks and shared marks
  const allMarks = [...savedMarks, ...(sharedMarks || [])]

  // Fetch nearby lakes for freshwater sessions
  const { data: nearbyLakes } = useLakes({
    lat: formData.latitude,
    lng: formData.longitude,
    radiusKm: 30,
    enabled: formData.waterType === 'freshwater' && formData.latitude !== null,
  })

  // Pre-select lake or mark if navigated from Explore page or via URL params
  useEffect(() => {
    const state = location.state as { 
      lakeId?: string
      lakeName?: string
      markId?: string
      markName?: string 
    } | null
    
    // Also check URL params (used when navigating from lake detail page)
    const urlParams = new URLSearchParams(location.search)
    const urlLakeId = urlParams.get('lakeId')
    const urlLakeName = urlParams.get('lakeName')
    const urlLat = urlParams.get('lat')
    const urlLng = urlParams.get('lng')
    
    // Use URL params or state - URL params take priority
    const lakeId = urlLakeId || state?.lakeId
    const lakeName = urlLakeName || state?.lakeName
    const lat = urlLat ? parseFloat(urlLat) : null
    const lng = urlLng ? parseFloat(urlLng) : null
    
    if (lakeId) {
      setFormData(prev => ({ 
        ...prev, 
        lakeId,
        locationName: lakeName ? decodeURIComponent(lakeName) : undefined,
        latitude: lat,
        longitude: lng,
        waterType: 'freshwater',
      }))
      if (lat && lng) {
        setLocationCoords({ lat, lng })
      }
    }
    
    // If navigating with a mark, find it and pre-fill location
    if (state?.markId) {
      const mark = savedMarks.find(m => m.id === state.markId)
      if (mark) {
        setFormData(prev => ({ 
          ...prev, 
          markId: state.markId,
          latitude: mark.latitude,
          longitude: mark.longitude,
          locationName: mark.name,
          waterType: 'saltwater', // Marks are typically sea fishing spots
        }))
        // Also update the location coords for the picker
        setLocationCoords({ lat: mark.latitude, lng: mark.longitude })
      }
    }
  }, [location.state, location.search, savedMarks])

  const handleQuickStart = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    // Prevent duplicate creation (StrictMode / event races)
    if (isCreatingSessionRef.current) return
    isCreatingSessionRef.current = true

    setStep(0)
    setShowSuccess(false)
    setLoading(true)
    
    // Check URL params for lake info
    const urlParams = new URLSearchParams(location.search)
    const urlLakeId = urlParams.get('lakeId')
    const urlLakeName = urlParams.get('lakeName')
    const urlLat = urlParams.get('lat')
    const urlLng = urlParams.get('lng')
    
    // Check if we have a pre-selected lake from URL params
    const hasLake = urlLakeId && urlLat && urlLng
    
    // Check if we have a pre-selected mark from navigation
    const navState = location.state as { markId?: string; markName?: string } | null
    const markFromList = navState?.markId ? allMarks.find(m => m.id === navState.markId) : null
    
    // If we have a markId but couldn't find it in allMarks, fetch it directly
    let preSelectedMark = markFromList
    if (navState?.markId && !markFromList) {
      const { data: markData } = await supabase
        .from('saved_marks')
        .select('*')
        .eq('id', navState.markId)
        .single()
      if (markData) {
        preSelectedMark = markData
      }
    }
    
    // Set loading message based on what we have
    if (hasLake) {
      setLoadingMessage(`Setting up at ${decodeURIComponent(urlLakeName || 'the lake')}...`)
    } else if (preSelectedMark) {
      setLoadingMessage(`Setting up at ${preSelectedMark.name}...`)
    } else {
      setLoadingMessage('Getting your location...')
    }

    await new Promise((r) => setTimeout(r, 400))
    setLoadingMessage('Setting up your session...')
    await new Promise((r) => setTimeout(r, 400))

    const now = new Date()
    
    // Generate title based on location
    const locationName = hasLake 
      ? decodeURIComponent(urlLakeName || 'Lake') 
      : preSelectedMark?.name || 'Fishing'
    const title = `${locationName} - ${now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })}`

    // Get coordinates for weather fetch - prioritize lake, then mark
    const lat = hasLake ? parseFloat(urlLat!) : (preSelectedMark?.latitude ?? 0)
    const lng = hasLake ? parseFloat(urlLng!) : (preSelectedMark?.longitude ?? 0)

    // Fetch weather and tide snapshot
    let weatherTemp: number | null = null
    let weatherCondition: string | null = null
    let windSpeed: number | null = null
    let tideState: string | null = null

    if (lat !== 0 && lng !== 0) {
      setLoadingMessage('Fetching weather conditions...')
      try {
        const [weatherData, tideData] = await Promise.all([
          getCompleteWeatherData(lat, lng).catch(() => null),
          getTideData(lat, lng).catch(() => null),
        ])

        if (weatherData?.current) {
          weatherTemp = weatherData.current.temperature
          windSpeed = weatherData.current.windSpeed
          const code = weatherData.current.weatherCode
          weatherCondition = WEATHER_CODES[code]?.description || null
        }

        if (tideData?.current?.type) {
          const t = tideData.current.type
          tideState = t.charAt(0).toUpperCase() + t.slice(1)
        }
      } catch (e) {
        console.warn('[StartSessionPage] Quick start - failed to fetch weather/tide:', e)
      }
    }

    setLoadingMessage('Creating your session...')

    // Build session data based on what we have (lake, mark, or nothing)
    let sessionData: Record<string, unknown>
    
    if (hasLake) {
      // Lake session - use lake info from URL params
      sessionData = {
        user_id: user.id,
        title,
        location_name: decodeURIComponent(urlLakeName || 'Lake'),
        water_type: 'Lake/Reservoir',
        location_privacy: 'general',
        latitude: lat,
        longitude: lng,
        started_at: now.toISOString(),
        is_public: formData.isPublic ?? true,
        lake_id: urlLakeId,
        weather_temp: weatherTemp,
        weather_condition: weatherCondition,
        wind_speed: windSpeed,
        tide_state: null, // No tides for freshwater
        moon_phase: getMoonPhase().phase,
      }
    } else if (preSelectedMark) {
      // Mark session - use mark data
      sessionData = {
        user_id: user.id,
        title,
        location_name: preSelectedMark.name,
        water_type: preSelectedMark.water_type || 'saltwater',
        location_privacy: 'general',
        latitude: preSelectedMark.latitude,
        longitude: preSelectedMark.longitude,
        started_at: now.toISOString(),
        is_public: formData.isPublic ?? true,
        mark_id: preSelectedMark.id,
        weather_temp: weatherTemp,
        weather_condition: weatherCondition,
        wind_speed: windSpeed,
        tide_state: tideState,
        moon_phase: getMoonPhase().phase,
      }
    } else {
      // Default - no specific location
      sessionData = {
        user_id: user.id,
        title,
        location_name: 'Current Location',
        water_type: 'saltwater',
        location_privacy: 'general',
        latitude: 0,
        longitude: 0,
        started_at: now.toISOString(),
        is_public: formData.isPublic ?? true,
        weather_temp: null,
        weather_condition: null,
        wind_speed: null,
        tide_state: null,
        moon_phase: getMoonPhase().phase,
      }
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single()

    if (error || !data) {
      console.error('Error creating quick start session', error)
      setLoading(false)
      isCreatingSessionRef.current = false
      alert('Something went wrong starting your session. Please try again.')
      return
    }

    // Create participant record with spot data
    try {
      await upsertParticipant({
        sessionId: data.id,
        spotName: hasLake 
          ? decodeURIComponent(urlLakeName || 'Lake')
          : (preSelectedMark?.name ?? 'Current Location'),
        markId: preSelectedMark?.id ?? null,
        latitude: lat,
        longitude: lng,
        waterType: hasLake ? 'Lake/Reservoir' : (preSelectedMark?.water_type ?? 'saltwater'),
        locationPrivacy: 'general',
      })
    } catch (e) {
      console.warn('Failed to create participant record:', e)
    }

    setCreatedSessionId(data.id)
    setLoading(false)
    setShowSuccess(true)

    setTimeout(() => {
      navigate(`/sessions/${data.id}`)
    }, 2000)
  }

  const handleFullSetup = () => {
    setShowSuccess(false)
    setLoading(false)
    
    // Check if we have a lake pre-selected - skip location step
    const urlParams = new URLSearchParams(location.search)
    const hasLake = urlParams.get('lakeId') && urlParams.get('lat') && urlParams.get('lng')
    
    if (hasLake) {
      // Skip to step 2 (water type is already set to freshwater)
      setStep(2)
    } else {
      setStep(1)
    }
  }

  const handleBack = () => {
    if (loading) return
    
    // Check if we have a lake pre-selected
    const urlParams = new URLSearchParams(location.search)
    const hasLake = urlParams.get('lakeId') && urlParams.get('lat') && urlParams.get('lng')
    
    if (step > 2) {
      setStep((s) => s - 1)
      return
    }
    if (step === 2 && hasLake) {
      // Go back to choice screen, skip step 1
      setStep(0)
      return
    }
    if (step === 2) {
      setStep(1)
      return
    }
    if (step === 1) {
      setStep(0)
      return
    }
    navigate(-1)
  }

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.locationName) return
      setStep(2)
      return
    }

    if (step === 2) {
      if (!formData.waterType) return
      setStep(3)
      return
    }

    if (step === 3) {
      setStep(4)
      return
    }

    if (step === 4) {
      await handleCreateSession()
    }
  }

  const handleCreateSession = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    // Prevent duplicate creation (StrictMode / event races)
    if (isCreatingSessionRef.current) return
    isCreatingSessionRef.current = true

    setLoading(true)
    setLoadingMessage('Fetching weather conditions...')

    const now = new Date()
    const lat = formData.latitude ?? 0
    const lng = formData.longitude ?? 0

    // Fetch weather and tide snapshot
    let weatherTemp: number | null = null
    let weatherCondition: string | null = null
    let windSpeed: number | null = null
    let tideState: string | null = null

    if (lat !== 0 && lng !== 0) {
      try {
        const [weatherData, tideData] = await Promise.all([
          getCompleteWeatherData(lat, lng).catch(() => null),
          getTideData(lat, lng).catch(() => null),
        ])

        if (weatherData?.current) {
          weatherTemp = weatherData.current.temperature
          windSpeed = weatherData.current.windSpeed
          const code = weatherData.current.weatherCode
          weatherCondition = WEATHER_CODES[code]?.description || null
        }

        if (tideData?.current?.type) {
          const t = tideData.current.type
          tideState = t.charAt(0).toUpperCase() + t.slice(1)
        }
      } catch (e) {
        console.warn('[StartSessionPage] Failed to fetch weather/tide:', e)
      }
    }

    setLoadingMessage('Creating your session...')

    // Generate auto title if user left it blank
    const autoTitle = formData.title.trim() || `${formData.locationName || 'Fishing'} · ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        title: autoTitle,
        location_name: formData.locationName ?? 'Fishing spot',
        water_type: formData.waterType ?? 'saltwater',
        location_privacy: formData.privacy,
        latitude: lat,
        longitude: lng,
        started_at: now.toISOString(),
        is_public: formData.isPublic ?? true,
        session_notes: formData.notes ?? null,
        lake_id: formData.lakeId ?? null,
        mark_id: formData.markId ?? null,
        weather_temp: weatherTemp,
        weather_condition: weatherCondition,
        wind_speed: windSpeed,
        tide_state: tideState,
        moon_phase: getMoonPhase().phase,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Error creating session', error)
      setLoading(false)
      isCreatingSessionRef.current = false
      alert('Something went wrong starting your session. Please try again.')
      return
    }

    // Create participant record with spot data
    try {
      await upsertParticipant({
        sessionId: data.id,
        spotName: formData.locationName ?? 'Fishing spot',
        markId: formData.markId ?? null,
        latitude: lat,
        longitude: lng,
        waterType: formData.waterType ?? 'saltwater',
        locationPrivacy: formData.privacy,
      })
    } catch (e) {
      console.warn('Failed to create participant record:', e)
    }

    setCreatedSessionId(data.id)
    setLoading(false)
    setShowSuccess(true)

    setTimeout(() => {
      navigate(`/sessions/${data.id}`)
    }, 2000)
  }

  useEffect(() => {
    if (step === 3 && !formData.privacy) {
      setFormData((prev) => ({ ...prev, privacy: 'general' }))
    }
  }, [step, formData.privacy])

  const fallbackToDefaultLocation = () => {
    if (profile?.default_latitude != null && profile?.default_longitude != null) {
      const latitude = profile.default_latitude
      const longitude = profile.default_longitude

      setLocationCoords({ lat: latitude, lng: longitude })
      setFormData((prev) => ({
        ...prev,
        latitude,
        longitude,
        locationName: prev.locationName ?? 'Default home spot',
      }))
      setLocationError(null)
    } else {
      setLocationError('Could not get your current location. Drag the pin to set your spot.')
    }
  }

  const openLocationPicker = () => {
    setIsLocationPickerOpen(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      fallbackToDefaultLocation()
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setLocationCoords({ lat: latitude, lng: longitude })
        setFormData((prev) => ({
          ...prev,
          latitude,
          longitude,
          locationName: prev.locationName ?? 'Current location',
        }))
      },
      () => {
        fallbackToDefaultLocation()
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handleLocationChange = ({ lat, lng }: { lat: number; lng: number }) => {
    setLocationCoords({ lat, lng })
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      locationName: prev.locationName ?? 'Pinned location',
    }))
  }

  const handleConfirmLocation = () => {
    if (locationCoords.lat == null || locationCoords.lng == null) {
      setLocationError('Drop a pin on the map to continue.')
      return
    }
    setFormData((prev) => ({
      ...prev,
      locationName: prev.locationName ?? 'Pinned location',
    }))
    setIsLocationPickerOpen(false)
  }

  const renderProgress = () => {
    if (step < 1 || step > 4) return null
    
    // Check if we have a lake pre-selected (skip step 1)
    const urlParams = new URLSearchParams(location.search)
    const hasLake = urlParams.get('lakeId') && urlParams.get('lat') && urlParams.get('lng')
    
    // For lake sessions: 3 steps (2,3,4 become 1,2,3)
    // For regular sessions: 4 steps
    const totalSteps = hasLake ? 3 : 4
    const currentStep = hasLake ? step - 1 : step
    const progress = (currentStep / totalSteps) * 100
    
    return (
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        <div className="h-1 rounded-full bg-muted">
          <div
            className="h-1 rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  const renderHeader = () => {
    if (loading || showSuccess) return null

    if (step === 0) {
      return (
        <header className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs font-medium text-muted-foreground hover:underline"
          >
            Cancel
          </button>
          <h1 className="text-sm font-semibold text-foreground">Start Session</h1>
          <div className="w-10" />
        </header>
      )
    }

    return (
      <header className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs font-medium text-muted-foreground hover:underline"
        >
          Back
        </button>
        <h1 className="text-sm font-semibold text-foreground">Start Session</h1>
        <div className="w-10" />
      </header>
    )
  }

  const renderStep0 = () => {
    // Check if we have a pre-selected mark or lake
    const navState = location.state as { markId?: string; markName?: string } | null
    const preSelectedMark = navState?.markId ? allMarks.find(m => m.id === navState.markId) : null
    
    // Check URL params for lake
    const urlParams = new URLSearchParams(location.search)
    const urlLakeName = urlParams.get('lakeName')
    const hasLake = urlParams.get('lakeId') && urlParams.get('lat') && urlParams.get('lng')
    const lakeName = urlLakeName ? decodeURIComponent(urlLakeName) : null
    
    // Determine what location we have
    const locationDisplay = hasLake ? lakeName : (preSelectedMark?.name || null)
    
    return (
    <>
      {/* Lake header banner */}
      {hasLake && lakeName && (
        <div className="mb-4 rounded-xl bg-gradient-to-r from-emerald-900/30 to-teal-900/20 border border-emerald-500/30 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
              🏞️
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{lakeName}</p>
              <p className="text-xs text-emerald-400">Ready to start your session</p>
            </div>
          </div>
        </div>
      )}
      
      <h2 className="mb-1 text-lg font-bold text-foreground">
        {hasLake ? 'Start fishing!' : 'Start your session'}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {locationDisplay 
          ? `Tap Quick Start to begin at ${locationDisplay}` 
          : 'Choose how you\'d like to begin your fishing session.'}
      </p>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={handleQuickStart}
          className="flex items-center gap-3 rounded-2xl border-2 border-primary bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/80"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl text-white">
            ⚡
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Quick Start</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {locationDisplay ? `Start at ${locationDisplay}` : 'Use current location & smart defaults'}
            </p>
          </div>
          <ChevronRight size={18} className="text-primary" />
        </button>

        <button
          type="button"
          onClick={handleFullSetup}
          className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl text-primary">
            ⚙️
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Full Setup</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {hasLake ? 'Add notes or change privacy' : 'Customize location, privacy, and details'}
            </p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* Session visibility toggle - show for lake sessions */}
      {hasLake && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Show on lake page</p>
            <p className="text-xs text-muted-foreground">
              {formData.isPublic 
                ? 'Other anglers can see you\'re fishing here' 
                : 'Your session will be private'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.isPublic ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                formData.isPublic ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {hasLake 
          ? `💡 Quick Start will create your session at ${lakeName} with weather data and smart defaults.`
          : preSelectedMark 
            ? `💡 Quick Start will use your saved mark "${preSelectedMark.name}" as the location.`
            : '💡 Quick Start defaults: Uses your current GPS location, general area privacy, and auto-detects water type. You can edit everything later.'}
      </p>
    </>
  )}

  const renderStep1 = () => {
    const hasLocation =
      Boolean(formData.locationName) &&
      formData.latitude != null &&
      formData.longitude != null
    
    // Check if we came from a mark
    const preSelectedMark = formData.markId ? savedMarks.find(m => m.id === formData.markId) : null

    return (
      <>
        <h2 className="mb-1 text-lg font-bold text-foreground">Where are you fishing?</h2>
        <p className="mb-4 text-sm text-muted-foreground">Set your spot and give your session a name.</p>
        
        {/* Pre-selected mark indicator */}
        {preSelectedMark && (
          <div className="mb-4 rounded-xl border-2 border-primary bg-primary/10 p-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Starting at: {preSelectedMark.name}</p>
                <p className="text-xs text-muted-foreground">Your saved mark</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, markId: null }))}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Choose from existing saved marks */}
        {savedMarks.length > 0 && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Use one of your marks</label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={formData.markId ?? ''}
              onChange={(e) => {
                const value = e.target.value
                if (!value) {
                  setFormData((prev) => ({ ...prev, markId: null }))
                  return
                }

                const mark = savedMarks.find((m) => m.id === value)
                if (!mark) return

                setFormData((prev) => ({
                  ...prev,
                  markId: mark.id,
                  latitude: mark.latitude,
                  longitude: mark.longitude,
                  locationName: mark.name,
                  waterType: 'saltwater',
                }))
                setLocationCoords({ lat: mark.latitude, lng: mark.longitude })
              }}
            >
              <option value="">Select a saved mark (optional)</option>
              {savedMarks.map((mark) => (
                <option key={mark.id} value={mark.id}>
                  {mark.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">Well reuse this marks name and coordinates.</p>
          </div>
        )}

        <button
          type="button"
          onClick={openLocationPicker}
          className={`mb-4 flex items-center justify-between rounded-xl border-2 p-4 transition-colors ${
            hasLocation ? 'border-primary bg-background' : 'border-border bg-card hover:border-primary'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900/30 text-xl">
              📍
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">
                {hasLocation ? formData.locationName : 'Choose location'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {hasLocation ? 'Tap to change your spot' : 'Tap to set your fishing spot'}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-primary">
            {hasLocation ? 'Change' : 'Set'}
          </span>
        </button>

        <div className="mb-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Session Title (optional)</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={`${formData.locationName || 'Fishing'} · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
          />
        </div>
        <p className="mb-4 text-xs text-muted-foreground">💡 Leave blank for auto-generated name based on location & date</p>

        <button
          type="button"
          onClick={handleNext}
          disabled={!hasLocation}
          className="mt-2 w-full rounded-xl bg-navy-800 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-900 disabled:bg-navy-400 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </>
    )
  }

  const renderStep2 = () => {
    const selected = formData.waterType

    const makeCard = (type: WaterType, icon: string, title: string, description: string) => {
      const isSelected = selected === type
      return (
        <button
          key={type}
          type="button"
          onClick={() => setFormData((prev) => ({ ...prev, waterType: type }))}
          className={`flex items-center justify-between rounded-xl border-2 p-4 text-left transition-colors ${
            isSelected ? 'border-primary bg-background' : 'border-border bg-card'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${
                type === 'saltwater' ? 'bg-blue-900/30' : 'bg-emerald-900/30'
              }`}
            >
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
              isSelected ? 'bg-primary text-white' : 'border border-border bg-card text-transparent'
            }`}
          >
            ✔
          </div>
        </button>
      )
    }

    return (
      <>
        <h2 className="mb-1 text-lg font-bold text-foreground">What type of water?</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          This helps us show you the right species and fishing data.
        </p>

        <div className="space-y-3">
          {makeCard('saltwater', '🌊', 'Saltwater', 'Sea, ocean, coastal fishing')}
          {makeCard('freshwater', '🏞️', 'Freshwater', 'Lakes, rivers, ponds, canals')}
        </div>

        {/* Lake selector for freshwater */}
        {selected === 'freshwater' && nearbyLakes && nearbyLakes.length > 0 && (
          <div className="mt-4 rounded-xl border-2 border-border bg-card p-4">
            <label className="mb-2 block text-sm font-semibold text-foreground">
              🏞️ Link to a fishing venue (optional)
            </label>
            <select
              value={formData.lakeId ?? ''}
              onChange={(e) => setFormData(prev => ({ ...prev, lakeId: e.target.value || null }))}
              className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">No specific venue</option>
              {nearbyLakes.map((lake: Lake) => (
                <option key={lake.id} value={lake.id}>
                  {lake.name} {lake.distance ? `(${lake.distance.toFixed(1)} km)` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Linking helps build local fishing intel
            </p>
          </div>
        )}

        {/* Saved mark selector for saltwater */}
        {selected === 'saltwater' && allMarks && allMarks.length > 0 && (
          <div className="mt-4 rounded-xl border-2 border-border bg-card p-4">
            <label className="mb-2 block text-sm font-semibold text-foreground">
              📍 Start at a saved mark (optional)
            </label>
            <select
              value={formData.markId ?? ''}
              onChange={(e) => {
                const markId = e.target.value || null
                const mark = allMarks.find(m => m.id === markId)
                setFormData(prev => ({ 
                  ...prev, 
                  markId,
                  // Auto-fill location from mark
                  ...(mark ? {
                    latitude: mark.latitude,
                    longitude: mark.longitude,
                    locationName: mark.name,
                  } : {})
                }))
              }}
              className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Choose a mark...</option>
              {savedMarks.map((mark) => (
                <option key={mark.id} value={mark.id}>
                  {mark.name}
                </option>
              ))}
              {sharedMarks && sharedMarks.length > 0 && (
                <optgroup label="Shared with me">
                  {sharedMarks.map((mark) => (
                    <option key={mark.id} value={mark.id}>
                      {mark.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Your saved spots and marks shared with you
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={!selected}
          className="mt-4 w-full rounded-xl bg-navy-800 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-900 disabled:bg-navy-400 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </>
    )
  }

  const renderStep3 = () => {
    const selected = formData.privacy

    const makeCard = (value: Privacy, icon: string, title: string, description: string, extraClasses = '') => {
      const isSelected = selected === value
      return (
        <button
          key={value}
          type="button"
          onClick={() => setFormData((prev) => ({ ...prev, privacy: value }))}
          className={`flex items-center justify-between rounded-xl border-2 p-4 text-left transition-colors ${
            isSelected ? 'border-primary bg-background' : 'border-border bg-card'
          } ${extraClasses}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${
                value === 'private'
                  ? 'bg-red-900/30'
                  : value === 'general'
                    ? 'bg-yellow-900/30'
                    : 'bg-emerald-900/30'
              }`}
            >
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
              isSelected ? 'bg-primary text-white' : 'border border-border bg-card text-transparent'
            }`}
          >
            ✔
          </div>
        </button>
      )
    }

    return (
      <>
        <h2 className="mb-1 text-lg font-bold text-foreground">Location privacy</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Control how much location detail you share with others.
        </p>

        <div className="space-y-3">
          {makeCard('private', '🔒', 'Private', 'Location completely hidden')}
          {makeCard('general', '📍', 'General Area', 'Show approximate location (~5 km)', 'border-primary bg-background')}
          {makeCard('exact', '🎯', 'Exact Location', 'Share precise GPS coordinates')}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          💡 You can always change this later. We recommend 'General Area' to protect your fishing spots while still
          helping the community.
        </p>

        <button
          type="button"
          onClick={handleNext}
          className="mt-4 w-full rounded-xl bg-navy-800 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-900"
        >
          Continue
        </button>
      </>
    )
  }

  const renderStep4 = () => (
    <>
      <h2 className="mb-1 text-lg font-bold text-foreground">Add session details</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Tell your story! What are you hoping to catch? What's the weather like?
      </p>

      <div className="mb-1">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Description (Optional)</label>
        <textarea
          rows={6}
          value={formData.notes ?? ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="e.g., Perfect conditions today! Clear skies, light wind, incoming tide. Targeting bass with live sandeel..."
        />
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        📝 You can add photos and catches once your session starts
      </p>

      <button
        type="button"
        onClick={handleNext}
        className="mt-2 w-full rounded-xl bg-navy-800 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-900"
      >
        Start Session
      </button>
    </>
  )

  const renderLoading = () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Setting up your session…</p>
        <p className="mt-1 text-xs text-muted-foreground">{loadingMessage}</p>
      </div>
    </div>
  )

  const renderSuccess = () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-900/30 text-4xl">
        🎣
      </div>
      <div className="max-w-xs">
        <h2 className="text-xl font-bold text-foreground">Session Started!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your fishing session is now active. Start logging catches and share your adventure!
        </p>
      </div>
      {createdSessionId ? (
        <button
          type="button"
          onClick={() => navigate(`/sessions/${createdSessionId}`)}
          className="mt-2 rounded-xl bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-900"
        >
          View Active Session
        </button>
      ) : null}
    </div>
  )

  const [showSaveMarkInput, setShowSaveMarkInput] = useState(false)
  const [newMarkName, setNewMarkName] = useState('')
  const [isSavingMark, setIsSavingMark] = useState(false)

  const handleSaveAsMark = async () => {
    if (!newMarkName.trim() || locationCoords.lat == null || locationCoords.lng == null) return
    
    setIsSavingMark(true)
    try {
      const newMark = await createMark.mutateAsync({
        name: newMarkName.trim(),
        latitude: locationCoords.lat,
        longitude: locationCoords.lng,
        water_type: formData.waterType === 'freshwater' ? 'lake' : 'sea',
      })
      
      // Update form to use this new mark
      setFormData((prev) => ({
        ...prev,
        markId: newMark.id,
        locationName: newMark.name,
      }))
      
      setShowSaveMarkInput(false)
      setNewMarkName('')
    } catch (e) {
      console.error('Failed to save mark:', e)
    } finally {
      setIsSavingMark(false)
    }
  }

  const renderLocationModal = () => {
    if (!isLocationPickerOpen) return null

    const canConfirm = locationCoords.lat != null && locationCoords.lng != null
    const isNewLocation = !formData.markId && canConfirm

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-xl rounded-xl bg-card p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Set your spot</h3>
            <button
              type="button"
              onClick={() => setIsLocationPickerOpen(false)}
              className="text-xs font-medium text-muted-foreground hover:underline"
            >
              Close
            </button>
          </div>

          {locationError ? (
            <div className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{locationError}</div>
          ) : null}

          <p className="mb-2 text-xs text-muted-foreground">We use your current location and let you drop a pin.</p>

          <div className="overflow-hidden rounded-lg border border-border">
            <LocationPicker value={locationCoords} onChange={handleLocationChange} />
          </div>

          {/* Save as mark option */}
          {isNewLocation && !showSaveMarkInput && (
            <button
              type="button"
              onClick={() => setShowSaveMarkInput(true)}
              className="mt-3 w-full rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-300"
            >
              + Save this spot as a Mark
            </button>
          )}

          {isNewLocation && showSaveMarkInput && (
            <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3">
              <input
                type="text"
                value={newMarkName}
                onChange={(e) => setNewMarkName(e.target.value)}
                placeholder="e.g., Southend Pier, My secret spot"
                className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveMarkInput(false)
                    setNewMarkName('')
                  }}
                  className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsMark}
                  disabled={!newMarkName.trim() || isSavingMark}
                  className="flex-1 rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
                >
                  {isSavingMark ? 'Saving...' : 'Save Mark'}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirmLocation}
            className="mt-3 w-full rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-900 disabled:cursor-not-allowed disabled:bg-navy-400"
          >
            Use this spot
          </button>
        </div>
      </div>
    )
  }

  let content: ReactNode

  if (loading) {
    content = renderLoading()
  } else if (showSuccess) {
    content = renderSuccess()
  } else if (step === 0) {
    content = renderStep0()
  } else if (step === 1) {
    content = renderStep1()
  } else if (step === 2) {
    content = renderStep2()
  } else if (step === 3) {
    content = renderStep3()
  } else {
    content = renderStep4()
  }

  return (
    <Layout>
      <main className="min-h-screen bg-background px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {renderHeader()}
          {renderProgress()}
          <section className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground shadow">
            {content}
          </section>
        </div>
      </main>
      {renderLocationModal()}
    </Layout>
  )
}
