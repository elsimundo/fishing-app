import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Layout } from '../components/layout/Layout'
import { useSessions } from '../hooks/useSessions'
import { useCatches } from '../hooks/useCatches'
import { useTackleShops } from '../hooks/useTackleShops'
import { useProfile } from '../hooks/useProfile'
import { ExploreMap, type ExploreMarker, type ExploreMarkerType } from '../components/map/ExploreMap'
import { calculateDistance, formatDistance } from '../utils/distance'
import { TideCard } from '../components/explore/TideCard'
import { WeatherCard } from '../components/explore/WeatherCard'
import { TackleShopsCard } from '../components/explore/TackleShopsCard'
import { SessionsCatchesCard } from '../components/explore/SessionsCatchesCard'
import { LocalIntelCard } from '../components/explore/LocalIntelCard'
import { NearbyLakesCard } from '../components/explore/NearbyLakesCard'
import { MyMarksCard } from '../components/explore/MyMarksCard'
import { MyLakesCard } from '../components/explore/MyLakesCard'
import { useLakes } from '../hooks/useLakes'
import { useSavedMarks, useSharedMarks } from '../hooks/useSavedMarks'
import { useFishingZones } from '../hooks/useFishingZones'
import { MapPin, Navigation, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Lake } from '../types'

// Static POIs for clubs and charters (future: fetch from API)
const STATIC_POIS = {
  clubs: [
    { id: 'club-1', name: 'Brighton Sea Anglers', lat: 50.8175, lng: -0.115 },
  ],
  charters: [
    { id: 'charter-1', name: 'Brighton Charter Boats', lat: 50.8125, lng: -0.103 },
  ],
}

type ExploreFilterKey = 'sessions' | 'catches' | 'shops' | 'clubs' | 'charters' | 'lakes' | 'marks'

const TYPE_META: Record<ExploreMarkerType, { label: string; icon: string; className: string }> = {
  session: { label: 'Session', icon: '🎣', className: 'bg-emerald-100 text-emerald-700' },
  catch: { label: 'Catch', icon: '🐟', className: 'bg-sky-100 text-sky-700' },
  shop: { label: 'Tackle shop', icon: '🛒', className: 'bg-amber-100 text-amber-800' },
  club: { label: 'Club', icon: '👥', className: 'bg-indigo-100 text-indigo-700' },
  charter: { label: 'Charter boat', icon: '⛵', className: 'bg-rose-100 text-rose-700' },
  lake: { label: 'Lake', icon: '🏞️', className: 'bg-sky-100 text-sky-700' },
  mark: { label: 'My Mark', icon: '📍', className: 'bg-red-100 text-red-700' },
  'shared-mark': { label: 'Shared Mark', icon: '🤝', className: 'bg-green-100 text-green-700' },
  zone: { label: 'Fishing Zone', icon: '🎯', className: 'bg-purple-100 text-purple-700' },
}

export default function ExplorePage() {
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  
  // Determine what content to show based on fishing preference
  const fishingPreference = profile?.fishing_preference
  const showSaltwater = !fishingPreference || fishingPreference === 'sea' || fishingPreference === 'both'
  const showFreshwater = !fishingPreference || fishingPreference === 'freshwater' || fishingPreference === 'both'

  const [filters, setFilters] = useState<Record<ExploreFilterKey, boolean>>({
    sessions: true,
    catches: true,
    shops: true,
    clubs: true,
    charters: true,
    lakes: true,
    marks: true,
  })

  const [liveBounds, setLiveBounds] = useState<{
    north: number
    south: number
    east: number
    west: number
  } | null>(null)

  const [appliedBounds, setAppliedBounds] = useState<{
    north: number
    south: number
    east: number
    west: number
  } | null>(null)

  const [selectedMarker, setSelectedMarker] = useState<ExploreMarker | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [hasDefaultArea, setHasDefaultArea] = useState(false)

  // Current map center for data cards
  const mapCenter = useMemo(() => {
    // Use liveBounds (from map movement), then appliedBounds, then userLocation
    const bounds = liveBounds || appliedBounds
    if (bounds) {
      return {
        lat: (bounds.north + bounds.south) / 2,
        lng: (bounds.east + bounds.west) / 2,
      }
    }
    return userLocation
  }, [liveBounds, appliedBounds, userLocation])

  const { data: sessions } = useSessions()
  const { catches } = useCatches()
  
  // Fetch fishing zones for public catch data (aggregated, privacy-safe)
  const { data: fishingZones } = useFishingZones({
    bounds: appliedBounds || undefined,
    minCatches: 1,
    enabled: filters.catches,
  })
  
  const { data: lakes } = useLakes({
    lat: mapCenter?.lat,
    lng: mapCenter?.lng,
    bounds: appliedBounds,
    radiusKm: 100, // Larger radius since we're using bounds
    enabled: filters.lakes && showFreshwater,
  })

  // Fetch tackle shops from OpenStreetMap - only when user clicks "Search this area"
  const { data: shopsData } = useTackleShops(
    appliedBounds,
    userLocation,
    filters.shops
  )

  // Fetch saved marks for map display
  const { marks: savedMarks } = useSavedMarks()
  const { data: sharedMarks } = useSharedMarks()

  // Load saved default area or get user location on first load
  useEffect(() => {
    // Check for saved default area first
    const savedArea = localStorage.getItem('explore-default-area')
    if (savedArea) {
      try {
        const bounds = JSON.parse(savedArea)
        setAppliedBounds(bounds)
        setHasDefaultArea(true)
        // Still get user location for the blue dot
        navigator.geolocation?.getCurrentPosition(
          (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {},
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        )
        return
      } catch {
        localStorage.removeItem('explore-default-area')
      }
    }

    // No saved area - use geolocation
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserLocation({ lat, lng })
        // Set initial bounds around user location (~20km radius)
        const delta = 0.2
        setAppliedBounds({
          north: lat + delta,
          south: lat - delta,
          east: lng + delta,
          west: lng - delta,
        })
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }, [])

  const saveAsDefaultArea = () => {
    const boundsToSave = liveBounds || appliedBounds
    if (!boundsToSave) return
    localStorage.setItem('explore-default-area', JSON.stringify(boundsToSave))
    setHasDefaultArea(true)
    toast.success('Default area saved')
  }

  const clearDefaultArea = () => {
    localStorage.removeItem('explore-default-area')
    setHasDefaultArea(false)
    toast.success('Default area cleared')
  }

  // Helper to check if a water type matches user preference
  const matchesWaterPreference = (waterType: string | null | undefined): boolean => {
    if (!fishingPreference || fishingPreference === 'both') return true
    if (!waterType) return true // Show if unknown
    
    const isSaltwater = waterType === 'Sea/Coastal'
    if (fishingPreference === 'sea') return isSaltwater
    if (fishingPreference === 'freshwater') return !isSaltwater
    return true
  }

  const markers: ExploreMarker[] = useMemo(() => {
    const items: ExploreMarker[] = []

    if (filters.sessions && sessions) {
      for (const s of sessions) {
        if (!s.latitude || !s.longitude) continue
        if (!matchesWaterPreference(s.water_type)) continue
        items.push({
          id: `session-${s.id}`,
          type: 'session',
          lat: s.latitude,
          lng: s.longitude,
          title: s.title || s.location_name,
        })
      }
    }

    // Show fishing zones (aggregated public catch data) instead of individual catches
    // This protects exact locations while showing community activity
    if (filters.catches && fishingZones) {
      for (const zone of fishingZones) {
        items.push({
          id: `zone-${zone.id}`,
          type: 'zone',
          lat: zone.center_lat,
          lng: zone.center_lng,
          title: zone.display_name || `${zone.total_catches} catches`,
          totalCatches: zone.total_catches,
          topSpecies: zone.top_species || undefined,
        })
      }
    }
    
    // Also show user's own catches (they can see their own exact locations)
    if (filters.catches && catches) {
      for (const c of catches) {
        if (c.latitude == null || c.longitude == null) continue
        if (!matchesWaterPreference(c.water_type)) continue
        items.push({
          id: `catch-${c.id}`,
          type: 'catch',
          lat: c.latitude,
          lng: c.longitude,
          title: c.species,
        })
      }
    }

    if (filters.shops && shopsData?.shops) {
      for (const shop of shopsData.shops) {
        items.push({
          id: shop.id,
          type: 'shop',
          lat: shop.lat,
          lng: shop.lng,
          title: shop.name,
        })
      }
    }

    if (filters.clubs) {
      for (const club of STATIC_POIS.clubs) {
        items.push({ id: club.id, type: 'club', lat: club.lat, lng: club.lng, title: club.name })
      }
    }

    if (filters.charters) {
      for (const ch of STATIC_POIS.charters) {
        items.push({ id: ch.id, type: 'charter', lat: ch.lat, lng: ch.lng, title: ch.name })
      }
    }

    if (filters.lakes && lakes) {
      for (const lake of lakes) {
        items.push({
          id: `lake-${lake.id}`,
          type: 'lake',
          lat: lake.latitude,
          lng: lake.longitude,
          title: lake.name,
        })
      }
    }

    // Add saved marks
    if (filters.marks && savedMarks) {
      for (const mark of savedMarks) {
        items.push({
          id: `mark-${mark.id}`,
          type: 'mark',
          lat: mark.latitude,
          lng: mark.longitude,
          title: mark.name,
        })
      }
    }

    // Add shared marks
    if (filters.marks && sharedMarks) {
      for (const mark of sharedMarks) {
        items.push({
          id: `shared-mark-${mark.id}`,
          type: 'shared-mark',
          lat: mark.latitude,
          lng: mark.longitude,
          title: mark.name,
        })
      }
    }

    if (!appliedBounds) return items

    return items.filter((m) => {
      if (Number.isNaN(m.lat) || Number.isNaN(m.lng)) return false
      return (
        m.lat <= appliedBounds.north &&
        m.lat >= appliedBounds.south &&
        m.lng <= appliedBounds.east &&
        m.lng >= appliedBounds.west
      )
    })
  }, [sessions, catches, shopsData, lakes, savedMarks, sharedMarks, fishingZones, filters, appliedBounds, fishingPreference])

  const markersWithDistance: ExploreMarker[] = useMemo(() => {
    if (!userLocation) return markers
    return markers.map((marker) => ({
      ...marker,
      distance: calculateDistance(userLocation.lat, userLocation.lng, marker.lat, marker.lng),
    }))
  }, [markers, userLocation])

  const toggleFilter = (key: ExploreFilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const hasPendingBounds = useMemo(() => {
    if (!liveBounds) return false
    if (!appliedBounds) return true
    return (
      liveBounds.north !== appliedBounds.north ||
      liveBounds.south !== appliedBounds.south ||
      liveBounds.east !== appliedBounds.east ||
      liveBounds.west !== appliedBounds.west
    )
  }, [liveBounds, appliedBounds])

  const visibleMarkersCount = useMemo(() => {
    if (!liveBounds) return markersWithDistance.length
    return markersWithDistance.filter((marker) => {
      if (Number.isNaN(marker.lat) || Number.isNaN(marker.lng)) return false
      return (
        marker.lat <= liveBounds.north &&
        marker.lat >= liveBounds.south &&
        marker.lng <= liveBounds.east &&
        marker.lng >= liveBounds.west
      )
    }).length
  }, [markersWithDistance, liveBounds])

  const markerCounts = useMemo(
    () => ({
      session: markersWithDistance.filter((m) => m.type === 'session').length,
      catch: markersWithDistance.filter((m) => m.type === 'catch').length,
      shop: markersWithDistance.filter((m) => m.type === 'shop').length,
      lake: markersWithDistance.filter((m) => m.type === 'lake').length,
      club: markersWithDistance.filter((m) => m.type === 'club').length,
      charter: markersWithDistance.filter((m) => m.type === 'charter').length,
      mark: markersWithDistance.filter((m) => m.type === 'mark').length,
      'shared-mark': markersWithDistance.filter((m) => m.type === 'shared-mark').length,
    }),
    [markersWithDistance]
  )

  const pillVisible = useMemo(() => {
    if (selectedMarker) return false
    return hasPendingBounds
  }, [selectedMarker, hasPendingBounds])

  const applyBounds = () => {
    if (!liveBounds) return
    setAppliedBounds(liveBounds)
  }

  const handleMarkerClick = (marker: ExploreMarker) => {
    setSelectedMarker(marker)
  }

  const handleSelectLakeFromCard = (lake: Lake) => {
    const marker = markers.find((m) => m.id === `lake-${lake.id}`)
    if (!marker) return
    setSelectedMarker(marker)

    const mapSection = document.getElementById('explore-map')
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleViewDetails = () => {
    if (!selectedMarker) return
    if (selectedMarker.id.startsWith('session-')) {
      navigate(`/sessions/${selectedMarker.id.replace('session-', '')}`)
    } else if (selectedMarker.id.startsWith('catch-')) {
      navigate(`/catches/${selectedMarker.id.replace('catch-', '')}`)
    }
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLiveBounds(null)
        setAppliedBounds(null)
        setIsLocating(false)
      },
      (error) => {
        setIsLocating(false)
        alert(`Location error: ${error.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Chip colors matching marker colors
  const chipColors: Record<ExploreFilterKey, { active: string; inactive: string }> = {
    sessions: { active: 'bg-teal-700 text-white', inactive: 'bg-teal-100 text-teal-700 hover:bg-teal-200' },
    catches: { active: 'bg-blue-600 text-white', inactive: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    shops: { active: 'bg-orange-500 text-white', inactive: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
    lakes: { active: 'bg-sky-500 text-white', inactive: 'bg-sky-100 text-sky-700 hover:bg-sky-200' },
    clubs: { active: 'bg-violet-600 text-white', inactive: 'bg-violet-100 text-violet-700 hover:bg-violet-200' },
    charters: { active: 'bg-rose-600 text-white', inactive: 'bg-rose-100 text-rose-700 hover:bg-rose-200' },
    marks: { active: 'bg-red-600 text-white', inactive: 'bg-red-100 text-red-700 hover:bg-red-200' },
  }

  const renderFilterChip = (key: ExploreFilterKey, label: string, count?: number) => (
    <button
      key={key}
      type="button"
      onClick={() => toggleFilter(key)}
      className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors shadow-sm ${
        filters[key] ? chipColors[key].active : chipColors[key].inactive
      }`}
    >
      {label}
      {filters[key] && count && count > 0 && (
        <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold">
          {count}
        </span>
      )}
    </button>
  )

  // Prepare data for cards
  const sessionsForCard = (sessions || []).map((s) => ({
    id: s.id,
    title: s.title,
    location_name: s.location_name,
    latitude: s.latitude,
    longitude: s.longitude,
    started_at: s.started_at,
  }))

  const catchesForCard = (catches || []).map((c) => ({
    id: c.id,
    species: c.species,
    latitude: c.latitude ?? undefined,
    longitude: c.longitude ?? undefined,
    caught_at: c.caught_at,
  }))

  return (
    <Layout>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Explore</h1>
              <p className="text-xs text-gray-500">Find fishing spots & conditions</p>
            </div>
            <button
              type="button"
              onClick={handleUseMyLocation}
              className="flex items-center gap-1.5 rounded-full bg-navy-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-900"
            >
              <Navigation size={14} />
              {isLocating ? 'Locating…' : 'My Location'}
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {renderFilterChip('sessions', 'Sessions', markerCounts.session)}
            {renderFilterChip('catches', 'Catches', markerCounts.catch)}
            {renderFilterChip('shops', 'Shops', markerCounts.shop)}
            {showFreshwater && renderFilterChip('lakes', 'Lakes', markerCounts.lake)}
            {renderFilterChip('marks', 'Marks', (markerCounts.mark || 0) + (markerCounts['shared-mark'] || 0))}
            {renderFilterChip('clubs', 'Clubs', markerCounts.club)}
            {showSaltwater && renderFilterChip('charters', 'Charters', markerCounts.charter)}
          </div>
        </header>

        {/* Compact Map */}
        <section id="explore-map" className="relative h-[35vh] min-h-[200px] bg-gray-100">
          {pillVisible && (
            <button
              type="button"
              onClick={applyBounds}
              className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-navy-800 px-4 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-navy-900"
            >
              Search this area
              {visibleMarkersCount > 0 && (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                  {visibleMarkersCount}
                </span>
              )}
            </button>
          )}

          {/* Reset button */}
          {appliedBounds && userLocation && (
            <button
              type="button"
              onClick={() => {
                setAppliedBounds(null)
                setLiveBounds(null)
                setSelectedMarker(null)
              }}
              className="absolute bottom-3 right-3 z-20 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 shadow-md hover:bg-gray-50"
            >
              ↻ Reset
            </button>
          )}

          {selectedMarker && (
            <div className="absolute bottom-3 left-3 right-3 z-20 rounded-xl bg-white/95 p-3 text-xs shadow-lg backdrop-blur">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedMarker.title}</p>
                  {selectedMarker.distance !== undefined && (
                    <p className="text-[10px] text-gray-600">
                      📍 {formatDistance(selectedMarker.distance)} away
                    </p>
                  )}
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_META[selectedMarker.type].className}`}
                  >
                    {TYPE_META[selectedMarker.type].icon} {TYPE_META[selectedMarker.type].label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMarker(null)}
                  className="text-xs font-medium text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              {(selectedMarker.id.startsWith('session-') || selectedMarker.id.startsWith('catch-')) && (
                <button
                  type="button"
                  onClick={handleViewDetails}
                  className="w-full rounded-lg bg-navy-800 px-3 py-2 text-xs font-medium text-white hover:bg-navy-900"
                >
                  {selectedMarker.id.startsWith('session-') ? 'View session' : 'View catch'}
                </button>
              )}
              {selectedMarker.id.startsWith('lake-') && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.lat},${selectedMarker.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      📍 Directions
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const lakeId = selectedMarker.id.replace('lake-', '')
                        navigate('/sessions/new', { state: { lakeId, lakeName: selectedMarker.title } })
                      }}
                      className="flex-1 rounded-lg bg-navy-800 px-3 py-2 text-xs font-medium text-white hover:bg-navy-900"
                    >
                      🎣 Log Session
                    </button>
                  </div>
                  {(() => {
                    const lakeId = selectedMarker.id.replace('lake-', '')
                    if (lakeId.startsWith('osm-')) return null
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          navigate(`/lakes/${lakeId}`)
                        }}
                        className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90"
                      >
                        View lake page
                      </button>
                    )
                  })()}
                </div>
              )}
              {(selectedMarker.type === 'mark' || selectedMarker.type === 'shared-mark') && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.lat},${selectedMarker.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Navigation size={12} className="inline mr-1" />
                      Directions
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const markId = selectedMarker.id.replace('mark-', '').replace('shared-mark-', '')
                        navigate('/sessions/new', { state: { markId, markName: selectedMarker.title } })
                      }}
                      className="flex-1 rounded-lg bg-navy-800 px-3 py-2 text-xs font-medium text-white hover:bg-navy-900"
                    >
                      🎣 Log Session
                    </button>
                  </div>
                  {selectedMarker.type === 'shared-mark' && (
                    <p className="text-center text-[10px] text-gray-500">
                      Shared with you by a friend
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <ExploreMap
            markers={markers}
            initialBounds={appliedBounds ?? undefined}
            userLocation={userLocation ?? undefined}
            onBoundsChange={setLiveBounds}
            onMarkerClick={handleMarkerClick}
          />
        </section>

        {/* Data Cards */}
        <section className="flex flex-col gap-3 px-4 py-4">
          {/* Location indicator with default area controls */}
          <div className="flex items-center justify-between">
            {mapCenter && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <MapPin size={14} className="text-gray-400" />
                <span>
                  Showing data for {mapCenter.lat.toFixed(3)}, {mapCenter.lng.toFixed(3)}
                </span>
              </div>
            )}
            
            {/* Default area buttons */}
            <div className="flex items-center gap-2">
              {(liveBounds || appliedBounds) && !hasDefaultArea && (
                <button
                  type="button"
                  onClick={saveAsDefaultArea}
                  className="rounded-full bg-navy-800 px-3 py-1 text-[11px] font-medium text-white hover:bg-navy-900"
                >
                  ⭐ Set as default
                </button>
              )}
              {hasDefaultArea && (
                <button
                  type="button"
                  onClick={clearDefaultArea}
                  className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
                >
                  ✕ Clear default
                </button>
              )}
            </div>
          </div>

          {/* Local Intel Card */}
          <LocalIntelCard 
            lat={mapCenter?.lat ?? null} 
            lng={mapCenter?.lng ?? null} 
            waterPreference={fishingPreference}
          />

          {/* Tide Card - only for saltwater anglers */}
          {showSaltwater && (
            <TideCard lat={mapCenter?.lat ?? null} lng={mapCenter?.lng ?? null} />
          )}

          {/* Weather Card */}
          <WeatherCard lat={mapCenter?.lat ?? null} lng={mapCenter?.lng ?? null} />

          {/* Tackle Shops Card */}
          <TackleShopsCard
            lat={mapCenter?.lat ?? null}
            lng={mapCenter?.lng ?? null}
            shops={shopsData?.shops || []}
          />

          {/* Nearby Lakes Card - only for freshwater anglers */}
          {showFreshwater && (
            <NearbyLakesCard
              lat={mapCenter?.lat ?? null}
              lng={mapCenter?.lng ?? null}
              bounds={appliedBounds}
              onSelectLake={handleSelectLakeFromCard}
            />
          )}

          {/* My Marks / Watchlist - for any custom spots (sea, rivers, canals, etc.) */}
          <MyMarksCard
            onSelectMark={(mark) => {
              // Navigate to mark detail page
              navigate(`/marks/${mark.id}`)
            }}
          />

          {/* My Lakes / Watchlist - for freshwater venues */}
          {showFreshwater && (
            <MyLakesCard
              onSelectLake={handleSelectLakeFromCard}
            />
          )}

          {/* List Your Business Banner */}
          <Link
            to="/businesses/submit"
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-navy-800 to-navy-900 p-4 shadow-sm transition-transform hover:scale-[1.02]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Store size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Own a fishing business?</p>
              <p className="text-xs text-white/80">List your shop, charter, or club for free</p>
            </div>
            <span className="text-lg text-white">→</span>
          </Link>

          {/* Sessions & Catches Card */}
          <SessionsCatchesCard
            lat={mapCenter?.lat ?? null}
            lng={mapCenter?.lng ?? null}
            sessions={sessionsForCard}
            catches={catchesForCard}
          />
        </section>
      </main>
    </Layout>
  )
}
