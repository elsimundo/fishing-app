import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, MapPin, Navigation, Search, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'react-hot-toast'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

interface DefaultLocationModalProps {
  onComplete: () => void
}

// UK center as fallback
const DEFAULT_CENTER: [number, number] = [-1.5, 53.5]
const DEFAULT_ZOOM = 5

export function DefaultLocationModal({ onComplete }: DefaultLocationModalProps) {
  const { user } = useAuth()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Click to place marker
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat
      placeMarker(lat, lng)
      reverseGeocode(lat, lng)
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  const placeMarker = useCallback((lat: number, lng: number) => {
    if (!map.current) return

    // Remove existing marker
    if (marker.current) {
      marker.current.remove()
    }

    // Create new marker
    marker.current = new mapboxgl.Marker({ color: '#1e3a5f' })
      .setLngLat([lng, lat])
      .addTo(map.current)

    setSelectedLocation({ lat, lng })
  }, [])

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,neighborhood`
      )
      const data = await response.json()
      if (data.features?.[0]) {
        setLocationName(data.features[0].place_name)
      } else {
        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      }
    } catch {
      setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        placeMarker(latitude, longitude)
        reverseGeocode(latitude, longitude)
        map.current?.flyTo({ center: [longitude, latitude], zoom: 10 })
        setIsLocating(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        toast.error('Could not get your location')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,region,country&limit=5`
      )
      const data = await response.json()
      setSearchResults(data.features || [])
    } catch {
      toast.error('Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectSearchResult = (result: any) => {
    const [lng, lat] = result.center
    placeMarker(lat, lng)
    setLocationName(result.place_name)
    map.current?.flyTo({ center: [lng, lat], zoom: 10 })
    setSearchResults([])
    setSearchQuery('')
  }

  const handleSave = async () => {
    if (!selectedLocation || !user) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          default_latitude: selectedLocation.lat,
          default_longitude: selectedLocation.lng,
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Location saved!')
      onComplete()
    } catch (error: any) {
      console.error('Failed to save location:', error)
      toast.error('Failed to save location')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = async () => {
    // Set a default UK location so they don't see this again
    if (!user) {
      onComplete()
      return
    }

    try {
      await supabase
        .from('profiles')
        .update({
          default_latitude: DEFAULT_CENTER[1],
          default_longitude: DEFAULT_CENTER[0],
        })
        .eq('id', user.id)
    } catch {
      // Ignore errors on skip
    }
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/95 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[#243B4A] border border-[#334155]">
        {/* Header */}
        <div className="border-b border-[#334155] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1BA9A0]/20">
              <MapPin className="h-5 w-5 text-[#1BA9A0]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Set Your Home Area</h1>
              <p className="text-sm text-gray-400">
                Where do you usually fish? This helps us center your maps.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-[#334155] px-5 py-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for a town or city..."
                className="w-full rounded-xl border border-[#334155] bg-[#1A2D3D] py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#1BA9A0] focus:outline-none focus:ring-1 focus:ring-[#1BA9A0]"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="rounded-xl bg-[#1BA9A0] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#14B8A6] disabled:bg-[#334155]"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-[#334155] bg-[#1A2D3D]">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelectSearchResult(result)}
                  className="flex w-full items-center gap-2 border-b border-[#334155] px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#334155] last:border-b-0"
                >
                  <MapPin size={14} className="flex-shrink-0 text-gray-500" />
                  <span className="truncate">{result.place_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="relative flex-1">
          <div ref={mapContainer} className="h-full w-full" />
          
          {/* Use Current Location Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-[#243B4A] border border-[#334155] px-4 py-2.5 text-sm font-medium text-gray-300 shadow-lg hover:bg-[#334155] disabled:opacity-50"
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            Use My Location
          </button>

          {/* Selected Location Badge */}
          {selectedLocation && locationName && (
            <div className="absolute left-4 right-4 top-4 flex items-center gap-2 rounded-xl bg-[#243B4A]/95 border border-[#334155] px-4 py-3 shadow-lg backdrop-blur-sm">
              <MapPin className="h-4 w-4 flex-shrink-0 text-[#1BA9A0]" />
              <span className="flex-1 truncate text-sm font-medium text-white">
                {locationName}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedLocation(null)
                  setLocationName('')
                  marker.current?.remove()
                }}
                className="rounded-full p-1 hover:bg-[#334155]"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#334155] px-5 py-4">
          <p className="mb-3 text-center text-xs text-gray-500">
            Tap on the map or search to set your default area
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 rounded-xl border border-[#334155] bg-[#1A2D3D] px-4 py-3 font-semibold text-gray-300 transition-colors hover:bg-[#334155]"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedLocation || isSaving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1BA9A0] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#14B8A6] disabled:bg-[#334155]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
