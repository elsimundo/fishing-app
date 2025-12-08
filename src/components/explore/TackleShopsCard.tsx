import { useState } from 'react'
import { Store, ChevronDown, ChevronUp, Phone, Globe, Navigation } from 'lucide-react'
import { calculateDistance, formatDistance } from '../../utils/distance'
import type { TackleShop } from '../../types/shops'

interface TackleShopsCardProps {
  lat: number | null
  lng: number | null
  shops: TackleShop[]
}

export function TackleShopsCard({ lat, lng, shops }: TackleShopsCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Calculate distances and sort by nearest
  const shopsWithDistance = shops
    .map((shop) => ({
      ...shop,
      distance: lat && lng ? calculateDistance(lat, lng, shop.lat, shop.lng) : undefined,
    }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))

  const nearbyShops = shopsWithDistance.filter((s) => s.distance === undefined || s.distance < 50) // Within 50km

  if (nearbyShops.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3 text-gray-400">
          <Store size={20} />
          <span className="text-sm font-medium">Tackle Shops</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">No tackle shops found nearby</p>
      </div>
    )
  }

  const nearestShop = nearbyShops[0]

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <Store size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Tackle Shops</p>
            <p className="text-xs text-gray-600">
              {nearbyShops.length} nearby · {nearestShop.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!expanded && nearestShop.distance !== undefined && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Nearest</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatDistance(nearestShop.distance)}
              </p>
            </div>
          )}
          {expanded ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <div className="mt-3 space-y-3">
            {nearbyShops.slice(0, 10).map((shop) => (
              <div key={shop.id} className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎣</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{shop.name}</p>
                    {shop.distance !== undefined && (
                      <p className="text-xs text-gray-500">
                        {formatDistance(shop.distance)} away
                      </p>
                    )}
                  </div>
                </div>

                {shop.address && (
                  <p className="mb-2 text-xs text-gray-600">{shop.address}</p>
                )}

                {shop.openingHours && (
                  <p className="mb-2 text-xs text-gray-500">🕒 {shop.openingHours}</p>
                )}

                <div className="flex gap-2">
                  {shop.phone && (
                    <a
                      href={`tel:${shop.phone}`}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone size={14} />
                      <span>Call</span>
                    </a>
                  )}
                  {shop.website && (
                    <a
                      href={shop.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Globe size={14} />
                      <span>Website</span>
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium hover:bg-primary/90"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Navigation size={14} />
                    Directions
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-center text-xs text-gray-400">
            Data from OpenStreetMap contributors
          </p>
        </div>
      )}
    </div>
  )
}
