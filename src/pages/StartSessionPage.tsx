import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Layout } from '../components/layout/Layout'
import { LocationPicker } from '../components/map/LocationPicker'
import { useLakes } from '../hooks/useLakes'
import { useSavedMarks } from '../hooks/useSavedMarks'
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
}

export default function StartSessionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

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
  })

  // Fetch user's saved marks for saltwater sessions
  const { marks: savedMarks } = useSavedMarks()

  // Fetch nearby lakes for freshwater sessions
  const { data: nearbyLakes } = useLakes({
    lat: formData.latitude,
    lng: formData.longitude,
    radiusKm: 30,
    enabled: formData.waterType === 'freshwater' && formData.latitude !== null,
  })

  // Pre-select lake or mark if navigated from Explore page
  useEffect(() => {
    const state = location.state as { 
      lakeId?: string
      lakeName?: string
      markId?: string
      markName?: string 
    } | null
    
    if (state?.lakeId) {
      setFormData(prev => ({ 
        ...prev, 
        lakeId: state.lakeId,
        waterType: 'freshwater',
      }))
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
  }, [location.state, savedMarks])

  const handleQuickStart = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    setStep(0)
    setShowSuccess(false)
    setLoading(true)
    setLoadingMessage('Getting your location...')

    await new Promise((r) => setTimeout(r, 1000))
    setLoadingMessage('Detecting water type...')
    await new Promise((r) => setTimeout(r, 1000))
    setLoadingMessage('Setting up your session...')
    await new Promise((r) => setTimeout(r, 1000))

    const now = new Date()
    const title = `Fishing Session - ${now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        title,
        location_name: 'Current Location',
        water_type: 'saltwater',
        location_privacy: 'general',
        latitude: 0,
        longitude: 0,
        started_at: now.toISOString(),
        is_public: true,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Error creating quick start session', error)
      setLoading(false)
      alert('Something went wrong starting your session. Please try again.')
      return
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
    setStep(1)
  }

  const handleBack = () => {
    if (loading) return
    if (step > 1) {
      setStep((s) => s - 1)
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
      if (!formData.locationName || !formData.title.trim()) return
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

    setLoading(true)
    setLoadingMessage('Creating your session...')

    const now = new Date()

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        title: formData.title.trim(),
        location_name: formData.locationName ?? 'Fishing spot',
        water_type: formData.waterType ?? 'saltwater',
        location_privacy: formData.privacy,
        latitude: formData.latitude ?? 0,
        longitude: formData.longitude ?? 0,
        started_at: now.toISOString(),
        is_public: true,
        description: formData.notes ?? null,
        lake_id: formData.lakeId ?? null,
        mark_id: formData.markId ?? null,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Error creating session', error)
      setLoading(false)
      alert('Something went wrong starting your session. Please try again.')
      return
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

  const openLocationPicker = () => {
    setIsLocationPickerOpen(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not available. Drag the pin to set your spot.')
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
        setLocationError('Could not get your current location. Drag the pin instead.')
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
    const progress = (step / 4) * 100
    return (
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
          <span>
            Step {step} of 4
          </span>
        </div>
        <div className="h-1 rounded-full bg-gray-200">
          <div
            className="h-1 rounded-full bg-navy-800 transition-all"
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
            className="text-xs font-medium text-gray-500 hover:underline"
          >
            Cancel
          </button>
          <h1 className="text-sm font-semibold text-gray-900">Start Session</h1>
          <div className="w-10" />
        </header>
      )
    }

    return (
      <header className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs font-medium text-gray-500 hover:underline"
        >
          Back
        </button>
        <h1 className="text-sm font-semibold text-gray-900">Start Session</h1>
        <div className="w-10" />
      </header>
    )
  }

  const renderChoiceStep = () => (
    <>
      <h2 className="mb-1 text-lg font-bold text-gray-900">Start your session</h2>
      <p className="mb-4 text-sm text-gray-600">
        Choose how you'd like to begin your fishing session.
      </p>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={handleQuickStart}
          className="flex items-center gap-3 rounded-2xl border-2 border-navy-800 bg-gray-50 p-4 text-left shadow-sm transition-colors hover:border-navy-900"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-800 text-2xl text-white">
            ⚡
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Quick Start</p>
            <p className="mt-0.5 text-xs text-gray-600">Use current location & smart defaults</p>
          </div>
          <ChevronRight size={18} className="text-navy-800" />
        </button>

        <button
          type="button"
          onClick={handleFullSetup}
          className="flex items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-navy-800"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl text-blue-600">
            ⚙️
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Full Setup</p>
            <p className="mt-0.5 text-xs text-gray-600">Customize location, privacy, and details</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      <p className="text-xs text-gray-500">
        💡 Quick Start defaults: Uses your current GPS location, general area privacy, and auto-detects water
        type. You can edit everything later.
      </p>
    </>
  )

  const renderStep1 = () => {
    const hasLocation =
      Boolean(formData.locationName) &&
      formData.latitude != null &&
      formData.longitude != null
    const hasTitle = Boolean(formData.title.trim())
    
    // Check if we came from a mark
    const preSelectedMark = formData.markId ? savedMarks.find(m => m.id === formData.markId) : null

    return (
      <>
        <h2 className="mb-1 text-lg font-bold text-gray-900">Where are you fishing?</h2>
        <p className="mb-4 text-sm text-gray-600">Set your spot and give your session a name.</p>
        
        {/* Pre-selected mark indicator */}
        {preSelectedMark && (
          <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 p-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Starting at: {preSelectedMark.name}</p>
                <p className="text-xs text-gray-600">Your saved mark</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, markId: null }))}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={openLocationPicker}
          className={`mb-4 flex items-center justify-between rounded-xl border-2 p-4 transition-colors ${
            hasLocation ? 'border-navy-800 bg-gray-50' : 'border-gray-300 bg-white hover:border-navy-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl">
              📍
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">
                {hasLocation ? formData.locationName : 'Choose location'}
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                {hasLocation ? 'Tap to change your spot' : 'Tap to set your fishing spot'}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-600">
            {hasLocation ? 'Change' : 'Set'}
          </span>
        </button>

        <div className="mb-1">
          <label className="mb-1 block text-xs font-medium text-gray-700">Session Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
            placeholder="e.g., Morning Bass Session"
          />
        </div>
        <p className="mb-4 text-xs text-gray-500">💡 Give your session a memorable name</p>

        <button
          type="button"
          onClick={handleNext}
          disabled={!hasLocation || !hasTitle}
          className="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
            isSelected ? 'border-navy-800 bg-gray-50' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${
                type === 'saltwater' ? 'bg-blue-100' : 'bg-emerald-100'
              }`}
            >
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="mt-0.5 text-xs text-gray-600">{description}</p>
            </div>
          </div>
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
              isSelected ? 'bg-navy-800 text-white' : 'border border-gray-300 bg-white text-transparent'
            }`}
          >
            ✔
          </div>
        </button>
      )
    }

    return (
      <>
        <h2 className="mb-1 text-lg font-bold text-gray-900">What type of water?</h2>
        <p className="mb-4 text-sm text-gray-600">
          This helps us show you the right species and fishing data.
        </p>

        <div className="space-y-3">
          {makeCard('saltwater', '🌊', 'Saltwater', 'Sea, ocean, coastal fishing')}
          {makeCard('freshwater', '🏞️', 'Freshwater', 'Lakes, rivers, ponds, canals')}
        </div>

        {/* Lake selector for freshwater */}
        {selected === 'freshwater' && nearbyLakes && nearbyLakes.length > 0 && (
          <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white p-4">
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              🏞️ Link to a fishing venue (optional)
            </label>
            <select
              value={formData.lakeId ?? ''}
              onChange={(e) => setFormData(prev => ({ ...prev, lakeId: e.target.value || null }))}
              className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
            >
              <option value="">No specific venue</option>
              {nearbyLakes.map((lake: Lake) => (
                <option key={lake.id} value={lake.id}>
                  {lake.name} {lake.distance ? `(${lake.distance.toFixed(1)} km)` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Linking helps build local fishing intel
            </p>
          </div>
        )}

        {/* Saved mark selector for saltwater */}
        {selected === 'saltwater' && savedMarks && savedMarks.length > 0 && (
          <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white p-4">
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              📍 Start at a saved mark (optional)
            </label>
            <select
              value={formData.markId ?? ''}
              onChange={(e) => {
                const markId = e.target.value || null
                const mark = savedMarks.find(m => m.id === markId)
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
              className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
            >
              <option value="">Choose a mark...</option>
              {savedMarks.map((mark) => (
                <option key={mark.id} value={mark.id}>
                  {mark.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Your saved fishing spots
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={!selected}
          className="mt-4 w-full rounded-xl bg-navy-800 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-900 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
            isSelected ? 'border-navy-800 bg-gray-50' : 'border-gray-200 bg-white'
          } ${extraClasses}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${
                value === 'private'
                  ? 'bg-red-100'
                  : value === 'general'
                    ? 'bg-yellow-100'
                    : 'bg-emerald-100'
              }`}
            >
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="mt-0.5 text-xs text-gray-600">{description}</p>
            </div>
          </div>
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
              isSelected ? 'bg-navy-800 text-white' : 'border border-gray-300 bg-white text-transparent'
            }`}
          >
            ✔
          </div>
        </button>
      )
    }

    return (
      <>
        <h2 className="mb-1 text-lg font-bold text-gray-900">Location privacy</h2>
        <p className="mb-4 text-sm text-gray-600">
          Control how much location detail you share with others.
        </p>

        <div className="space-y-3">
          {makeCard('private', '🔒', 'Private', 'Location completely hidden')}
          {makeCard('general', '📍', 'General Area', 'Show approximate location (~5 km)', 'border-navy-800 bg-gray-50')}
          {makeCard('exact', '🎯', 'Exact Location', 'Share precise GPS coordinates')}
        </div>

        <p className="mt-4 text-xs text-gray-500">
          💡 You can always change this later. We recommend 'General Area' to protect your fishing spots while still
          helping the community.
        </p>

        <button
          type="button"
          onClick={handleNext}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          Continue
        </button>
      </>
    )
  }

  const renderStep4 = () => (
    <>
      <h2 className="mb-1 text-lg font-bold text-gray-900">Add session details</h2>
      <p className="mb-4 text-sm text-gray-600">
        Tell your story! What are you hoping to catch? What's the weather like?
      </p>

      <div className="mb-1">
        <label className="mb-1 block text-xs font-medium text-gray-700">Description (Optional)</label>
        <textarea
          rows={6}
          value={formData.notes ?? ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
          placeholder="e.g., Perfect conditions today! Clear skies, light wind, incoming tide. Targeting bass with live sandeel..."
        />
      </div>

      <p className="mb-4 text-xs text-gray-500">
        📝 You can add photos and catches once your session starts
      </p>

      <button
        type="button"
        onClick={handleNext}
        className="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
      >
        Start Session
      </button>
    </>
  )

  const renderLoading = () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <Loader2 className="h-8 w-8 animate-spin text-navy-800" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">Setting up your session…</p>
        <p className="mt-1 text-xs text-gray-600">{loadingMessage}</p>
      </div>
    </div>
  )

  const renderSuccess = () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
        🎣
      </div>
      <div className="max-w-xs">
        <h2 className="text-xl font-bold text-gray-900">Session Started!</h2>
        <p className="mt-2 text-sm text-gray-600">
          Your fishing session is now active. Start logging catches and share your adventure!
        </p>
      </div>
      {createdSessionId ? (
        <button
          type="button"
          onClick={() => navigate(`/sessions/${createdSessionId}`)}
          className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          View Active Session
        </button>
      ) : null}
    </div>
  )

  const renderLocationModal = () => {
    if (!isLocationPickerOpen) return null

    const canConfirm = locationCoords.lat != null && locationCoords.lng != null

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Set your spot</h3>
            <button
              type="button"
              onClick={() => setIsLocationPickerOpen(false)}
              className="text-xs font-medium text-gray-500 hover:underline"
            >
              Close
            </button>
          </div>

          {locationError ? (
            <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{locationError}</div>
          ) : null}

          <p className="mb-2 text-xs text-gray-600">We use your current location and let you drop a pin.</p>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <LocationPicker value={locationCoords} onChange={handleLocationChange} />
          </div>

          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirmLocation}
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Use this spot
          </button>
        </div>
      </div>
    )
  }

  let content: JSX.Element

  if (loading) {
    content = renderLoading()
  } else if (showSuccess) {
    content = renderSuccess()
  } else if (step === 0) {
    content = renderChoiceStep()
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
      <main className="px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {renderHeader()}
          {renderProgress()}
          <section className="rounded-2xl bg-white p-4 text-xs text-slate-700 shadow">
            {content}
          </section>
        </div>
      </main>
      {renderLocationModal()}
    </Layout>
  )
}
