import { useEffect, useRef } from 'react'
import mapboxgl, { Map as MapboxMapType, Marker } from 'mapbox-gl'

// Set Mapbox token at module level
const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
if (token) {
  mapboxgl.accessToken = token
} else {
  console.error('VITE_MAPBOX_TOKEN not found in environment variables')
}

export type ExploreMarkerType = 'session' | 'catch' | 'shop' | 'club' | 'charter'

export interface ExploreMarker {
  id: string
  type: ExploreMarkerType
  lat: number
  lng: number
  title: string
  distance?: number
  timestamp?: string
  weight?: number
}

interface ExploreMapProps {
  markers: ExploreMarker[]
  center?: { lat: number; lng: number }
  initialBounds?: { north: number; south: number; east: number; west: number }
  zoom?: number
  userLocation?: { lat: number; lng: number }
  onMarkerClick?: (marker: ExploreMarker) => void
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
}

const typeColors: Record<ExploreMarkerType, string> = {
  session: '#0f766e',
  catch: '#2563eb',
  shop: '#f97316',
  club: '#7c3aed',
  charter: '#e11d48',
}

export function ExploreMap({ markers, initialBounds, zoom = 9, userLocation, onMarkerClick, onBoundsChange }: ExploreMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapboxMapType | null>(null)
  const markersRef = useRef<Marker[]>([])
  const userMarkerRef = useRef<Marker | null>(null)

  // Store onBoundsChange in a ref to avoid re-init on callback change
  const onBoundsChangeRef = useRef(onBoundsChange)
  onBoundsChangeRef.current = onBoundsChange

  // Init map - only runs once on mount
  useEffect(() => {
    if (!token) {
      console.error('VITE_MAPBOX_TOKEN not found')
      return
    }
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    // Default center (Brighton) - will be overridden by initialBounds if available
    const defaultCenter = { lat: 50.82, lng: -0.14 }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom,
    })

    map.on('error', (e) => {
      console.error('Map error:', e)
    })

    map.on('moveend', () => {
      const b = map.getBounds()
      if (!b) return
      onBoundsChangeRef.current?.({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      })
    })

    mapRef.current = map

    return () => {
      markersRef.current.forEach((m) => m.remove())
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only init once

  // Respond to initialBounds changes (e.g., when loaded from localStorage)
  const initialBoundsApplied = useRef(false)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !initialBounds || initialBoundsApplied.current) return

    // Only apply once to avoid fighting with user panning
    initialBoundsApplied.current = true
    map.fitBounds(
      [[initialBounds.west, initialBounds.south], [initialBounds.east, initialBounds.north]],
      { padding: 20, duration: 500 }
    )
  }, [initialBounds])

  // Update markers when data changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear existing
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    markers.forEach((m) => {
      if (Number.isNaN(m.lat) || Number.isNaN(m.lng)) return

      const el = document.createElement('div')
      el.className = 'rounded-full border border-white shadow-md'
      el.style.width = '16px'
      el.style.height = '16px'
      el.style.backgroundColor = typeColors[m.type]

      if (onMarkerClick) {
        el.style.cursor = 'pointer'
        el.addEventListener('click', () => onMarkerClick(m))
      }

      const marker = new mapboxgl.Marker(el).setLngLat([m.lng, m.lat]).addTo(map)
      markersRef.current.push(marker)
    })

    // Only auto-fit to markers when no external bounds handling is used.
    // When onBoundsChange is provided (e.g. ExplorePage "search this area"),
    // we let the user control the viewport so the map doesn't snap back.
    if (!onBoundsChange && markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      markers.forEach((m) => bounds.extend([m.lng, m.lat]))
      map.fitBounds(bounds, { padding: 40, maxZoom: 13 })
    }
  }, [markers, onMarkerClick, onBoundsChange])

  // User location marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }

    if (!userLocation) return

    const el = document.createElement('div')
    el.className = 'user-location-pulse'

    const marker = new mapboxgl.Marker(el).setLngLat([userLocation.lng, userLocation.lat]).addTo(map)
    userMarkerRef.current = marker
  }, [userLocation])

  return <div ref={mapContainerRef} className="h-full w-full" />
}
