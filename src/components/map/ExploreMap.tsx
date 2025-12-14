import { useEffect, useRef } from 'react'
import mapboxgl, { Map as MapboxMapType, Marker } from 'mapbox-gl'

// Set Mapbox token at module level
const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
if (token) {
  mapboxgl.accessToken = token
} else {
  console.error('VITE_MAPBOX_TOKEN not found in environment variables')
}

export type ExploreMarkerType = 'session' | 'catch' | 'shop' | 'club' | 'charter' | 'lake' | 'mark' | 'shared-mark' | 'zone'

export interface ExploreMarker {
  id: string
  type: ExploreMarkerType
  lat: number
  lng: number
  title: string
  distance?: number
  timestamp?: string
  weight?: number
  // Zone-specific fields
  totalCatches?: number
  topSpecies?: string
}

type ExploreMapStyle = 'standard' | 'satellite'

interface ExploreMapProps {
  markers: ExploreMarker[]
  center?: { lat: number; lng: number }
  initialBounds?: { north: number; south: number; east: number; west: number }
  zoom?: number
  userLocation?: { lat: number; lng: number }
  focusPoint?: { lat: number; lng: number; zoom?: number } | null // Fly to this point when set
  mapStyle?: ExploreMapStyle
  onMarkerClick?: (marker: ExploreMarker) => void
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
  onMapClick?: (coords: { lat: number; lng: number }) => void
}

const MAP_STYLES: Record<ExploreMapStyle, string> = {
  standard: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
}

const typeColors: Record<ExploreMarkerType, string> = {
  session: '#0f766e',
  catch: '#2563eb',
  shop: '#f97316',
  club: '#7c3aed',
  charter: '#e11d48',
  lake: '#0ea5e9', // Sky blue for lakes
  mark: '#dc2626', // Red for your marks
  'shared-mark': '#dc2626', // Shared marks also use red so all your spots are consistent
  zone: '#2563eb', // Blue for fishing zones - matches catches filter pill
}

export function ExploreMap({ markers, initialBounds, zoom = 9, userLocation, focusPoint, mapStyle = 'satellite', onMarkerClick, onBoundsChange, onMapClick }: ExploreMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapboxMapType | null>(null)
  const markersRef = useRef<Marker[]>([])
  const userMarkerRef = useRef<Marker | null>(null)

  // Store callbacks in refs to avoid re-init on callback change
  const onBoundsChangeRef = useRef(onBoundsChange)
  onBoundsChangeRef.current = onBoundsChange

  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick

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
      style: MAP_STYLES[mapStyle],
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom,
      bearing: 0,
      pitch: 0,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
    })

    // Lock perspective so accidental tilts/rotations don't happen
    map.touchZoomRotate.disableRotation()
    // Use double-click for dropping marks instead of zooming
    map.doubleClickZoom.disable()

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

    // Double-click / double-tap handler so parent can react to explicit add-mark action
    map.on('dblclick', (e) => {
      onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng })
    })

    mapRef.current = map

    return () => {
      markersRef.current.forEach((m) => m.remove())
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only init once

  // Resize map when container size changes (e.g. expanded view)
  useEffect(() => {
    const map = mapRef.current
    const container = mapContainerRef.current
    if (!map || !container || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      map.resize()
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Switch map style without re-initializing the map
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setStyle(MAP_STYLES[mapStyle])
  }, [mapStyle])

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
      
      // Zone markers get a larger badge with catch count
      if (m.type === 'zone') {
        el.className = 'flex items-center justify-center rounded-full border-2 border-white shadow-lg'
        el.style.backgroundColor = typeColors[m.type]
        el.style.minWidth = '28px'
        el.style.height = '28px'
        el.style.padding = '0 6px'
        
        // Add catch count text inside the marker
        const countText = document.createElement('span')
        countText.textContent = String(m.totalCatches || '?')
        countText.style.color = 'white'
        countText.style.fontSize = '11px'
        countText.style.fontWeight = '600'
        countText.style.lineHeight = '1'
        el.appendChild(countText)
      } else {
        el.className = 'rounded-full border border-white shadow-md'
        el.style.width = '16px'
        el.style.height = '16px'
        el.style.backgroundColor = typeColors[m.type]
      }

      if (onMarkerClick) {
        el.style.cursor = 'pointer'
        el.addEventListener('click', () => onMarkerClick(m))
      }

      // Add tooltip with catch information for zones
      let popup: mapboxgl.Popup | undefined
      if (m.type === 'zone' && (m.totalCatches || m.topSpecies)) {
        const popupContent = `
          <div style="padding: 8px; min-width: 160px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">Fishing Zone</div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">~1km hotspot · exact marks private</div>
            ${m.totalCatches ? `<div style="font-size: 12px; color: #059669; margin-bottom: 2px;">🐟 ${m.totalCatches} catches logged</div>` : ''}
            ${m.topSpecies ? `<div style="font-size: 12px; color: #6366f1;">Top: ${m.topSpecies}</div>` : ''}
            <div style="font-size: 11px; color: #9ca3af; margin-top: 6px;">Click to see catches</div>
          </div>
        `
        popup = new mapboxgl.Popup({ 
          offset: 18,
          closeButton: false,
          closeOnClick: false,
        }).setHTML(popupContent)
        
        el.addEventListener('mouseenter', () => popup?.addTo(map))
        el.addEventListener('mouseleave', () => popup?.remove())
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

  // Fly to focus point when set
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusPoint) return

    map.flyTo({
      center: [focusPoint.lng, focusPoint.lat],
      zoom: focusPoint.zoom ?? 14,
      duration: 1500,
    })
  }, [focusPoint])

  return <div ref={mapContainerRef} className="h-full w-full" />
}
