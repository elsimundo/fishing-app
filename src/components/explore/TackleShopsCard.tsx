import { useState } from 'react'
import { Store, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { calculateDistance, formatDistance } from '../../utils/distance'

interface TackleShop {
  id: string
  name: string
  lat: number
  lng: number
  address?: string
  phone?: string
}

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
          <div className="mt-3 space-y-2">
            {nearbyShops.map((shop) => (
              <div
                key={shop.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                    <Store size={14} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{shop.name}</p>
                    {shop.address && (
                      <p className="text-xs text-gray-500">{shop.address}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {shop.distance !== undefined && (
                    <span className="text-xs font-medium text-gray-600">
                      {formatDistance(shop.distance)}
                    </span>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MapPin size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
