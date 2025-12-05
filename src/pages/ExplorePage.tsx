import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { useSessions } from '../hooks/useSessions'
import { useCatches } from '../hooks/useCatches'
import { ExploreMap, type ExploreMarker, type ExploreMarkerType } from '../components/map/ExploreMap'
import { calculateDistance, formatDistance } from '../utils/distance'
import { SortSelector, type SortOption } from '../components/explore/SortSelector'

const STATIC_POIS = {
  shops: [
    {
      id: 'shop-1',
      name: 'Brighton Angling Centre',
      lat: 50.8205,
      lng: -0.1372,
    },
  ],
  clubs: [
    {
      id: 'club-1',
      name: 'Brighton Sea Anglers',
      lat: 50.8175,
      lng: -0.115,
    },
  ],
  charters: [
    {
      id: 'charter-1',
      name: 'Brighton Charter Boats',
      lat: 50.8125,
      lng: -0.103,
    },
  ],
}

type ExploreFilterKey = 'sessions' | 'catches' | 'shops' | 'clubs' | 'charters'

const TYPE_META: Record<ExploreMarkerType, { label: string; icon: string; className: string }> = {
  session: {
    label: 'Session',
    icon: '🎣',
    className: 'bg-emerald-100 text-emerald-700',
  },
  catch: {
    label: 'Catch',
    icon: '🐟',
    className: 'bg-sky-100 text-sky-700',
  },
  shop: {
    label: 'Tackle shop',
    icon: '🛒',
    className: 'bg-amber-100 text-amber-800',
  },
  club: {
    label: 'Club',
    icon: '👥',
    className: 'bg-indigo-100 text-indigo-700',
  },
  charter: {
    label: 'Charter boat',
    icon: '⛵',
    className: 'bg-rose-100 text-rose-700',
  },
}

export default function ExplorePage() {
  const navigate = useNavigate()
  const [view, setView] = useState<'map' | 'list'>('map')
  const [filters, setFilters] = useState<Record<ExploreFilterKey, boolean>>({
    sessions: true,
    catches: true,
    shops: true,
    clubs: true,
    charters: true,
  })

  const [liveBounds, setLiveBounds] = useState<
    | {
        north: number
        south: number
        east: number
        west: number
      }
    | null
  >(null)

  const [appliedBounds, setAppliedBounds] = useState<
    | {
        north: number
        south: number
        east: number
        west: number
      }
    | null
  >(null)

  const [selectedMarker, setSelectedMarker] = useState<ExploreMarker | null>(null)

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('distance')

  const { data: sessions } = useSessions()
  const { catches } = useCatches()

  // Try to get user location on first load
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        console.log('User location obtained:', loc)
      },
      (error) => {
        console.warn('Geolocation error:', error.message)
        // Silent failure; user can still tap the button manually
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    )
  }, [])

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

    if (filters.shops) {
      for (const shop of STATIC_POIS.shops) {
        items.push({ id: shop.id, type: 'shop', lat: shop.lat, lng: shop.lng, title: shop.name })
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
  }, [sessions, catches, filters, appliedBounds])

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

  const renderFilterChip = (key: ExploreFilterKey, label: string, count?: number) => (
    <button
      key={key}
      type="button"
      onClick={() => toggleFilter(key)}
      className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
        filters[key]
          ? 'bg-primary text-white shadow-sm'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
      {filters[key] && count && count > 0 ? (
        <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">{count}</span>
      ) : null}
    </button>
  )

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
    [markersWithDistance],
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
      const sessionId = selectedMarker.id.replace('session-', '')
      navigate(`/sessions/${sessionId}`)
      return
    }

    if (selectedMarker.id.startsWith('catch-')) {
      const catchId = selectedMarker.id.replace('catch-', '')
      navigate(`/catches/${catchId}`)
      return
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
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setLiveBounds(null)
        setAppliedBounds(null)
        setIsLocating(false)
        console.log('Location updated:', loc)
      },
      (error) => {
        setIsLocating(false)
        console.error('Geolocation error:', error)
        alert(`Location error: ${error.message}. Please enable location permissions in your browser settings.`)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  return (
    <Layout>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 pb-28 pt-3">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Explore</h1>
            <p className="text-[11px] text-slate-500">Find sessions, catches and places to fish.</p>
          </div>
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-[11px] font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setView('map')}
              className={`rounded-full px-3 py-1 transition-colors ${
                view === 'map' ? 'bg-white text-slate-900 shadow-sm' : ''
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded-full px-3 py-1 transition-colors ${
                view === 'list' ? 'bg-white text-slate-900 shadow-sm' : ''
              }`}
            >
              List
            </button>
          </div>
        </header>

        <section className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap gap-2">
            {renderFilterChip('sessions', 'Sessions', markerCounts.session)}
            {renderFilterChip('catches', 'Catches', markerCounts.catch)}
            {renderFilterChip('shops', 'Tackle shops', markerCounts.shop)}
            {renderFilterChip('clubs', 'Clubs', markerCounts.club)}
            {renderFilterChip('charters', 'Charter boats', markerCounts.charter)}
          </div>
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
          >
            {isLocating ? 'Locating…' : 'Use my location'}
          </button>
        </section>

        {view === 'map' ? (
          <section className="relative mt-1 h-[60vh] overflow-hidden rounded-xl bg-surface shadow">
            {pillVisible ? (
              <button
                type="button"
                onClick={applyBounds}
                className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-md"
              >
                Search this area
                {visibleMarkersCount > 0 && (
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                    {visibleMarkersCount}
                  </span>
                )}
              </button>
            ) : null}

            {appliedBounds && userLocation ? (
              <button
                type="button"
                onClick={() => {
                  setAppliedBounds(null)
                  setLiveBounds(null)
                  setSelectedMarker(null)
                }}
                className="absolute bottom-3 right-3 z-20 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-md hover:bg-slate-50"
              >
                ↻ Reset view
              </button>
            ) : null}

            {selectedMarker ? (
              <div className="absolute bottom-3 left-3 right-3 z-20 rounded-xl bg-white/95 p-3 text-xs shadow-lg backdrop-blur">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[12px] font-semibold text-slate-900">{selectedMarker.title}</p>
                    {selectedMarker.distance !== undefined ? (
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-600">
                        <span>📍</span>
                        <span>{formatDistance(selectedMarker.distance)} away</span>
                      </div>
                    ) : null}
                    <span
                      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_META[selectedMarker.type].className}`}
                    >
                      <span>{TYPE_META[selectedMarker.type].icon}</span>
                      <span>{TYPE_META[selectedMarker.type].label}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMarker(null)}
                    className="text-[11px] font-medium text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>

                {(selectedMarker.id.startsWith('session-') || selectedMarker.id.startsWith('catch-')) && (
                  <button
                    type="button"
                    onClick={handleViewDetails}
                    className="w-full rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
                  >
                    {selectedMarker.id.startsWith('session-') ? 'View session' : 'View catch'}
                  </button>
                )}
              </div>
            ) : null}

            <ExploreMap
              markers={markers}
              center={userLocation ?? undefined}
              userLocation={userLocation ?? undefined}
              onBoundsChange={setLiveBounds}
              onMarkerClick={handleMarkerClick}
            />
          </section>
        ) : (
          <section className="mt-1 space-y-3 rounded-xl bg-surface p-3 text-xs text-slate-700 shadow">
            {markersWithDistance.length === 0 ? (
              <p className="text-[11px] text-slate-500">No places to show. Try changing filters or search area.</p>
            ) : (
              <>
                <div className="mb-2 flex justify-end">
                  <SortSelector
                    value={sortBy}
                    onChange={setSortBy}
                    hasUserLocation={!!userLocation}
                  />
                </div>
                {(['session', 'catch', 'shop', 'club', 'charter'] as ExploreMarkerType[]).map((type) => {
                  const itemsForType = markersWithDistance
                    .filter((m) => m.type === type)
                    .slice()
                    .sort((a, b) => {
                      if (sortBy === 'distance') {
                        if (!userLocation) return 0
                        if (a.distance === undefined) return 1
                        if (b.distance === undefined) return -1
                        return a.distance - b.distance
                      }

                      // date sort fallback using timestamp when present
                      if (a.timestamp && b.timestamp) {
                        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                      }
                      return 0
                    })
                  if (itemsForType.length === 0) return null

                  const labelMap: Record<ExploreMarkerType, string> = {
                    session: 'Sessions',
                    catch: 'Catches',
                    shop: 'Tackle shops',
                    club: 'Clubs',
                    charter: 'Charter boats',
                  }

                  return (
                    <div key={type} className="space-y-1">
                      <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {labelMap[type]}
                      </h2>
                      <ul className="space-y-1">
                        {itemsForType.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50"
                          >
                            <div>
                              <p className="text-[11px] font-medium text-slate-900">{m.title}</p>
                              <span
                                className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_META[m.type].className}`}
                              >
                                <span>{TYPE_META[m.type].icon}</span>
                                <span>{TYPE_META[m.type].label}</span>
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </>
            )}
          </section>
        )}
      </main>
    </Layout>
  )
}
