import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Layout } from '../components/layout/Layout'
import { useSessions } from '../hooks/useSessions'
import { useCatches } from '../hooks/useCatches'
import { useTackleShops } from '../hooks/useTackleShops'
import { ExploreMap, type ExploreMarker, type ExploreMarkerType } from '../components/map/ExploreMap'
import { calculateDistance, formatDistance } from '../utils/distance'
import { TideCard } from '../components/explore/TideCard'
import { WeatherCard } from '../components/explore/WeatherCard'
import { TackleShopsCard } from '../components/explore/TackleShopsCard'
import { SessionsCatchesCard } from '../components/explore/SessionsCatchesCard'
import { MapPin, Navigation, Store } from 'lucide-react'
import { Link } from 'react-router-dom'

// Static POIs for clubs and charters (future: fetch from API)
const STATIC_POIS = {
  clubs: [
    { id: 'club-1', name: 'Brighton Sea Anglers', lat: 50.8175, lng: -0.115 },
  ],
  charters: [
    { id: 'charter-1', name: 'Brighton Charter Boats', lat: 50.8125, lng: -0.103 },
  ],
}

type ExploreFilterKey = 'sessions' | 'catches' | 'shops' | 'clubs' | 'charters'

const TYPE_META: Record<ExploreMarkerType, { label: string; icon: string; className: string }> = {
  session: { label: 'Session', icon: '🎣', className: 'bg-emerald-100 text-emerald-700' },
  catch: { label: 'Catch', icon: '🐟', className: 'bg-sky-100 text-sky-700' },
  shop: { label: 'Tackle shop', icon: '🛒', className: 'bg-amber-100 text-amber-800' },
  club: { label: 'Club', icon: '👥', className: 'bg-indigo-100 text-indigo-700' },
  charter: { label: 'Charter boat', icon: '⛵', className: 'bg-rose-100 text-rose-700' },
}

export default function ExplorePage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Record<ExploreFilterKey, boolean>>({
    sessions: true,
    catches: true,
    shops: true,
    clubs: true,
    charters: true,
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

  // Fetch tackle shops from OpenStreetMap - only when user clicks "Search this area"
  const { data: shopsData } = useTackleShops(
    appliedBounds,
    userLocation,
    filters.shops
  )

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

  const markers: ExploreMarker[] = useMemo(() => {
    const items: ExploreMarker[] = []

    if (filters.sessions && sessions) {
      for (const s of sessions) {
        if (!s.latitude || !s.longitude) continue
        items.push({
          id: `session-${s.id}`,
          type: 'session',
          lat: s.latitude,
          lng: s.longitude,
          title: s.title || s.location_name,
        })
      }
    }

    if (filters.catches && catches) {
      for (const c of catches) {
        if (c.latitude == null || c.longitude == null) continue
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
  }, [sessions, catches, shopsData, filters, appliedBounds])

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
      club: markersWithDistance.filter((m) => m.type === 'club').length,
      charter: markersWithDistance.filter((m) => m.type === 'charter').length,
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

  const renderFilterChip = (key: ExploreFilterKey, label: string, count?: number) => (
    <button
      key={key}
      type="button"
      onClick={() => toggleFilter(key)}
      className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
        filters[key]
          ? 'bg-navy-800 text-white shadow-sm'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            {renderFilterChip('clubs', 'Clubs', markerCounts.club)}
            {renderFilterChip('charters', 'Charters', markerCounts.charter)}
          </div>
        </header>

        {/* Compact Map */}
        <section className="relative h-[35vh] min-h-[200px] bg-gray-100">
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

          {/* Bottom right buttons */}
          <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-2">
            {/* Save as default button */}
            {(liveBounds || appliedBounds) && !hasDefaultArea && (
              <button
                type="button"
                onClick={saveAsDefaultArea}
                className="rounded-full bg-navy-800 px-3 py-1.5 text-[11px] font-medium text-white shadow-md hover:bg-navy-900"
              >
                ⭐ Set as default
              </button>
            )}
            
            {/* Clear default button */}
            {hasDefaultArea && (
              <button
                type="button"
                onClick={clearDefaultArea}
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-amber-600 shadow-md hover:bg-amber-50"
              >
                ✕ Clear default
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
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 shadow-md hover:bg-gray-50"
              >
                ↻ Reset
              </button>
            )}
          </div>

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
            </div>
          )}

          <ExploreMap
            markers={markers}
            center={userLocation ?? undefined}
            userLocation={userLocation ?? undefined}
            onBoundsChange={setLiveBounds}
            onMarkerClick={handleMarkerClick}
          />
        </section>

        {/* Data Cards */}
        <section className="flex flex-col gap-3 px-4 py-4">
          {/* Location indicator */}
          {mapCenter && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin size={14} className="text-gray-400" />
              <span>
                Showing data for {mapCenter.lat.toFixed(3)}, {mapCenter.lng.toFixed(3)}
              </span>
            </div>
          )}

          {/* Tide Card */}
          <TideCard lat={mapCenter?.lat ?? null} lng={mapCenter?.lng ?? null} />

          {/* Weather Card */}
          <WeatherCard lat={mapCenter?.lat ?? null} lng={mapCenter?.lng ?? null} />

          {/* Tackle Shops Card */}
          <TackleShopsCard
            lat={mapCenter?.lat ?? null}
            lng={mapCenter?.lng ?? null}
            shops={shopsData?.shops || []}
          />

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
