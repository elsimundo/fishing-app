import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { Catch } from '../../types'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../lib/constants'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string

type MapProps = {
  catches: Catch[]
  variant?: 'full' | 'mini'
  center?: { lat: number; lng: number }
  showCenterMarker?: boolean
}

export function Map({ catches, variant = 'full', center, showCenterMarker = false }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [DEFAULT_MAP_CENTER.lng, DEFAULT_MAP_CENTER.lat],
      zoom: DEFAULT_MAP_ZOOM,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

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

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear existing markers by storing them on the map instance
    const existing = (map as any)._catchMarkers as mapboxgl.Marker[] | undefined
    existing?.forEach((m) => m.remove())

    const markers: mapboxgl.Marker[] = []

    catches.forEach((catchItem) => {
      if (catchItem.latitude == null || catchItem.longitude == null) return

      const el = document.createElement('div')
      el.className =
        'flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-accent shadow'

      const photoHtml = catchItem.photo_url
        ? `<div style="margin-bottom:4px;"><img src="${catchItem.photo_url}" alt="${catchItem.species}" style="width:80px;height:50px;object-fit:cover;border-radius:4px;" /></div>`
        : ''

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([catchItem.longitude, catchItem.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 12 }).setHTML(
            `<div style="font-size:12px;">${photoHtml}<strong>${catchItem.species}</strong><br/>${
              catchItem.weight_kg ? `${catchItem.weight_kg.toFixed(1)} kg<br/>` : ''
            }${catchItem.location_name}</div>`,
          ),
        )
        .addTo(map)

      markers.push(marker)
    })

    ;(map as any)._catchMarkers = markers

    // Adjust view: if we have catches, center/fit to them
    if (markers.length === 1) {
      const lngLat = markers[0].getLngLat()
      const isMini = variant === 'mini'
      map.easeTo({
        center: lngLat,
        zoom: isMini ? 12 : 10,
      })
    } else if (markers.length > 1) {
      const bounds = new mapboxgl.LngLatBounds()
      markers.forEach((m) => bounds.extend(m.getLngLat()))
      map.fitBounds(bounds, { padding: 40, maxZoom: 10 })
    } else if (center) {
      // No catches but we have a center point - zoom to it
      map.easeTo({
        center: [center.lng, center.lat],
        zoom: variant === 'mini' ? 12 : 10,
      })
    }

    // Add center marker if requested and we have a center
    if (showCenterMarker && center) {
      // Remove existing center marker
      const existingCenter = (map as any)._centerMarker as mapboxgl.Marker | undefined
      existingCenter?.remove()

      const el = document.createElement('div')
      el.className = 'flex h-6 w-6 items-center justify-center rounded-full bg-navy-800 border-2 border-white shadow-lg'
      el.innerHTML = '<span style="font-size:12px;">📍</span>'

      const centerMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([center.lng, center.lat])
        .addTo(map)

      ;(map as any)._centerMarker = centerMarker
    }
  }, [catches, variant, center, showCenterMarker])

  useEffect(() => {
    mapRef.current?.resize()
  }, [variant])

  return <div ref={mapContainerRef} className="h-full w-full rounded-lg" />
}
