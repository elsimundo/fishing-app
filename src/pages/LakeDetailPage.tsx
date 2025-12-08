import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Lake } from '../types'
import { Layout } from '../components/layout/Layout'
import { MapPin, ArrowLeft, Globe, Phone, Car, Coffee } from 'lucide-react'

export default function LakeDetailPage() {
  const { slugOrId } = useParams<{ slugOrId: string }>()
  const navigate = useNavigate()
  const [lake, setLake] = useState<Lake | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slugOrId) return

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        // Try by slug first (safe for any string)
        let { data, error } = await supabase
          .from('lakes')
          .select('*')
          .eq('slug', slugOrId)
          .maybeSingle()

        // Fallback to id if no slug match AND the value looks like a UUID
        const uuidRegex = /^[0-9a-fA-F-]{32,36}$/
        if (!data && !error && uuidRegex.test(slugOrId)) {
          const { data: byId, error: byIdErr } = await supabase
            .from('lakes')
            .select('*')
            .eq('id', slugOrId)
            .maybeSingle()
          data = byId
          error = byIdErr
        }

        if (error) throw error
        if (!data) {
          setError('Lake not found')
        } else {
          setLake(data as Lake)
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load lake')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [slugOrId])

  return (
    <Layout>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col pb-24 px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {loading && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Loading lake...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && lake && (
          <div className="space-y-4">
            {/* Header */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h1 className="text-xl font-bold text-gray-900">{lake.name}</h1>
              {lake.region && (
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={12} /> {lake.region}
                </p>
              )}
              {lake.address && (
                <p className="mt-1 text-xs text-gray-500">{lake.address}</p>
              )}

              {lake.day_ticket_price && (
                <p className="mt-3 text-sm font-semibold text-gray-900">
                  Day ticket from £{lake.day_ticket_price.toFixed(2)}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-600">
                {lake.has_parking && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                    <Car size={12} /> Parking
                  </span>
                )}
                {lake.has_cafe && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                    <Coffee size={12} /> Café
                  </span>
                )}
                {lake.is_night_fishing_allowed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                    🌙 Night fishing
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {lake.website && (
                  <a
                    href={lake.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary/90"
                  >
                    <Globe size={12} /> Website
                  </a>
                )}
                {lake.phone && (
                  <a
                    href={`tel:${lake.phone}`}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    <Phone size={12} /> {lake.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Species & summary */}
            {lake.species && lake.species.length > 0 && (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-gray-900">Species</h2>
                <div className="flex flex-wrap gap-2">
                  {lake.species.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                    >
                      <span>🐟</span>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* TODO: later – sessions/catches at this lake, claim status, premium badge, etc. */}
          </div>
        )}
      </main>
    </Layout>
  )
}
