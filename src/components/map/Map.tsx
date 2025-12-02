import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { Catch } from '../../types'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../lib/constants'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string

type MapProps = {
  catches: Catch[]
  variant?: 'full' | 'mini'
}

export function Map({ catches, variant = 'full' }: MapProps) {
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
      const options: mapboxgl.EaseToOptions = {
        center: lngLat,
        zoom: isMini ? 11 : 10,
      }

      if (isMini) {
        // Push the map center slightly down so the marker appears higher in the mini map
        ;(options as any).offset = [0, -200]
      }

      map.easeTo(options)
    } else if (markers.length > 1) {
      const bounds = new mapboxgl.LngLatBounds()
      markers.forEach((m) => bounds.extend(m.getLngLat()))
      map.fitBounds(bounds, { padding: 40, maxZoom: 10 })
    }
  }, [catches, variant])

  useEffect(() => {
    mapRef.current?.resize()
  }, [variant])

  return <div ref={mapContainerRef} className="h-full w-full rounded-lg" />
}
