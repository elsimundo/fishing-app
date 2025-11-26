import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../lib/constants'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string

type LocationPickerProps = {
  value: { lat: number | null; lng: number | null }
  onChange: (coords: { lat: number; lng: number }) => void
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [
        value.lng ?? DEFAULT_MAP_CENTER.lng,
        value.lat ?? DEFAULT_MAP_CENTER.lat,
      ],
      zoom: DEFAULT_MAP_ZOOM,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.doubleClickZoom.disable()

    const marker = new mapboxgl.Marker({ draggable: true })
      .setLngLat([
        value.lng ?? DEFAULT_MAP_CENTER.lng,
        value.lat ?? DEFAULT_MAP_CENTER.lat,
      ])
      .addTo(map)

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat()
      onChange({ lat: lngLat.lat, lng: lngLat.lng })
    })

    map.on('click', (event) => {
      const { lng, lat } = event.lngLat
      marker.setLngLat([lng, lat])
      onChange({ lat, lng })
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      marker.remove()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  // If value changes from outside (e.g. geolocation), move map + marker
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    if (value.lat == null || value.lng == null) return

    const map = mapRef.current
    const marker = markerRef.current

    marker.setLngLat([value.lng, value.lat])
    map.panTo([value.lng, value.lat])
  }, [value.lat, value.lng])

  return <div ref={containerRef} className="h-48 w-full rounded-lg" />
}
