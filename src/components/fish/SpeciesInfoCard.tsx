import { Link } from 'react-router-dom'
import { Scale, Ruler, MapPin, Calendar, Clock, Trophy, Users, Fish, Anchor, Target, Loader2, Database } from 'lucide-react'
import { getSpeciesInfo, getSpeciesBaits, getSpeciesRigs, getSpeciesLegalSize } from '../../lib/speciesInfo'
import { useAppRecord, useSpeciesCatchCount, useSpeciesAnglerCount } from '../../hooks/useAppRecord'
import { useFishBaseData, formatFishBaseDescription, getFishBaseMaxSize, getFishBaseWaterType } from '../../hooks/useFishBase'
import type { RegionCode } from '../../types/species'

interface SpeciesInfoCardProps {
  speciesName: string
  region?: RegionCode
  showLogButton?: boolean
  onLogCatch?: () => void
}

export function SpeciesInfoCard({ 
  speciesName, 
  region = 'uk_england',
  showLogButton = false,
  onLogCatch,
}: SpeciesInfoCardProps) {
  const speciesInfo = getSpeciesInfo(speciesName)
  const baits = getSpeciesBaits(speciesName)
  const rigs = getSpeciesRigs(speciesName)
  const legalSize = speciesInfo ? getSpeciesLegalSize(speciesInfo.id, region) : null
  
  const { data: appRecord } = useAppRecord(speciesName)
  const { data: catchCount } = useSpeciesCatchCount(speciesName)
  const { data: anglerCount } = useSpeciesAnglerCount(speciesName)
  
  // Fallback to FishBase API if we don't have local data
  const { data: fishBaseData, isLoading: fishBaseLoading } = useFishBaseData(
    !speciesInfo ? speciesName : null
  )

  // If no local data and FishBase is loading
  if (!speciesInfo && fishBaseLoading) {
    return (
      <div className="rounded-xl bg-gray-50 p-6 text-center">
        <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-cyan-600" />
        <p className="text-sm text-gray-600">Looking up species data...</p>
      </div>
    )
  }

  // If no local data but we have FishBase data, show that
  if (!speciesInfo && fishBaseData?.species) {
    const maxSize = getFishBaseMaxSize(fishBaseData)
    const waterType = getFishBaseWaterType(fishBaseData)
    const description = formatFishBaseDescription(fishBaseData)
    
    return (
      <div className="space-y-4">
        {/* Header - FishBase data */}
        <div className="rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 p-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold">{fishBaseData.commonName || speciesName}</h3>
              {fishBaseData.species.sciname && (
                <p className="mt-0.5 text-sm italic text-slate-300">{fishBaseData.species.sciname}</p>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs">
              <Database size={12} />
              FishBase
            </div>
          </div>
          {description && (
            <p className="mt-2 text-sm text-slate-200">{description}</p>
          )}
        </div>

        {/* Quick Stats from FishBase */}
        <div className="grid grid-cols-2 gap-2">
          {maxSize.lengthCm && (
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <Ruler className="mx-auto mb-1 h-5 w-5 text-gray-500" />
              <p className="text-xs text-gray-500">Max Length</p>
              <p className="text-sm font-semibold text-gray-900">{maxSize.lengthCm} cm</p>
            </div>
          )}
          {maxSize.weightKg && (
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <Scale className="mx-auto mb-1 h-5 w-5 text-gray-500" />
              <p className="text-xs text-gray-500">Max Weight</p>
              <p className="text-sm font-semibold text-gray-900">{maxSize.weightKg.toFixed(1)} kg</p>
            </div>
          )}
        </div>

        {/* Water Type */}
        {waterType && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 py-2 text-sm text-blue-700">
            <Fish size={16} />
            <span className="capitalize">{waterType === 'both' ? 'Freshwater & Saltwater' : waterType}</span>
          </div>
        )}

        {/* Depth Range */}
        {fishBaseData.species.DepthRangeShallow != null && fishBaseData.species.DepthRangeDeep != null && (
          <div className="flex items-start gap-2 rounded-lg bg-cyan-50 p-3">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-600" />
            <div>
              <p className="text-xs font-medium text-cyan-800">Depth Range</p>
              <p className="text-sm text-cyan-700">
                {fishBaseData.species.DepthRangeShallow} - {fishBaseData.species.DepthRangeDeep} meters
              </p>
            </div>
          </div>
        )}

        {/* App Stats */}
        {((catchCount ?? 0) > 0 || (anglerCount ?? 0) > 0) && (
          <div className="flex items-center justify-center gap-6 rounded-lg bg-gray-50 py-3">
            {catchCount !== undefined && catchCount > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <Target className="h-4 w-4" />
                <span className="text-sm">
                  <span className="font-semibold text-gray-900">{catchCount}</span> catches logged
                </span>
              </div>
            )}
            {anglerCount !== undefined && anglerCount > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4" />
                <span className="text-sm">
                  <span className="font-semibold text-gray-900">{anglerCount}</span> anglers
                </span>
              </div>
            )}
          </div>
        )}

        {/* Note about data source */}
        <p className="text-center text-xs text-gray-400">
          Data from FishBase.org • Angling-specific info coming soon
        </p>

        {/* Log Catch Button */}
        {showLogButton && onLogCatch && (
          <button
            type="button"
            onClick={onLogCatch}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            Log a {fishBaseData.commonName || speciesName} Catch
          </button>
        )}
      </div>
    )
  }

  // No local data and no FishBase data
  if (!speciesInfo) {
    return (
      <div className="rounded-xl bg-gray-50 p-4 text-center">
        <Fish className="mx-auto mb-2 h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-600">No detailed information available for this species yet.</p>
        <p className="mt-1 text-xs text-gray-500">We're constantly adding more species data.</p>
        
        {/* Still allow logging */}
        {showLogButton && onLogCatch && (
          <button
            type="button"
            onClick={onLogCatch}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            Log a {speciesName} Catch
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 p-4 text-white">
        <h3 className="text-xl font-bold">{speciesInfo.commonName}</h3>
        {speciesInfo.scientificName && (
          <p className="mt-0.5 text-sm italic text-cyan-100">{speciesInfo.scientificName}</p>
        )}
        <p className="mt-2 text-sm text-cyan-50">{speciesInfo.description}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <Scale className="mx-auto mb-1 h-5 w-5 text-gray-500" />
          <p className="text-xs text-gray-500">Average</p>
          <p className="text-sm font-semibold text-gray-900">
            {speciesInfo.averageWeightKg.min}-{speciesInfo.averageWeightKg.max} kg
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-center">
          <Trophy className="mx-auto mb-1 h-5 w-5 text-amber-600" />
          <p className="text-xs text-amber-600">Trophy</p>
          <p className="text-sm font-semibold text-amber-700">{speciesInfo.trophyWeightKg}+ kg</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <Ruler className="mx-auto mb-1 h-5 w-5 text-gray-500" />
          <p className="text-xs text-gray-500">Length</p>
          <p className="text-sm font-semibold text-gray-900">
            {speciesInfo.averageLengthCm.min}-{speciesInfo.averageLengthCm.max} cm
          </p>
        </div>
      </div>

      {/* Legal Size Warning */}
      {legalSize?.minLengthCm && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <Ruler className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">Minimum Legal Size</p>
            <p className="text-lg font-bold text-red-900">{legalSize.minLengthCm} cm</p>
            {legalSize.bagLimitPerDay && (
              <p className="mt-0.5 text-xs text-red-700">Bag limit: {legalSize.bagLimitPerDay} per day</p>
            )}
            {legalSize.notes && (
              <p className="mt-1 text-xs text-red-600">{legalSize.notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Habitat & Timing */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
          <div>
            <p className="text-xs font-medium text-blue-800">Habitat</p>
            <p className="text-sm text-blue-700">{speciesInfo.habitat}</p>
          </div>
        </div>
        
        {(speciesInfo.bestSeason || speciesInfo.bestTime) && (
          <div className="grid grid-cols-2 gap-2">
            {speciesInfo.bestSeason && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3">
                <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                <div>
                  <p className="text-xs font-medium text-emerald-800">Best Season</p>
                  <p className="text-xs text-emerald-700">{speciesInfo.bestSeason}</p>
                </div>
              </div>
            )}
            {speciesInfo.bestTime && (
              <div className="flex items-start gap-2 rounded-lg bg-purple-50 p-3">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-600" />
                <div>
                  <p className="text-xs font-medium text-purple-800">Best Time</p>
                  <p className="text-xs text-purple-700">{speciesInfo.bestTime}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Baits & Rigs */}
      {(baits.length > 0 || rigs.length > 0) && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Anchor className="h-4 w-4" />
            Recommended Tackle
          </h4>
          
          {baits.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-600">Baits</p>
              <div className="flex flex-wrap gap-1.5">
                {baits.map((bait) => (
                  <span
                    key={bait}
                    className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800"
                  >
                    {bait}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {rigs.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-600">Rigs</p>
              <div className="flex flex-wrap gap-1.5">
                {rigs.map((rig) => (
                  <span
                    key={rig}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {rig}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Records Section */}
      <div className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Trophy className="h-4 w-4" />
          Records
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          {/* World Record */}
          {speciesInfo.worldRecord && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-700">🌍 World Record</p>
              <p className="text-lg font-bold text-amber-900">{speciesInfo.worldRecord.weightKg} kg</p>
              <p className="text-xs text-amber-600">
                {speciesInfo.worldRecord.location}, {speciesInfo.worldRecord.year}
              </p>
            </div>
          )}
          
          {/* App Record */}
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
            <p className="text-xs font-medium text-cyan-700">📱 App Record</p>
            {appRecord ? (
              <>
                <p className="text-lg font-bold text-cyan-900">{appRecord.weightKg.toFixed(2)} kg</p>
                <Link 
                  to={`/${appRecord.username}`}
                  className="text-xs text-cyan-600 hover:underline"
                >
                  by @{appRecord.username || 'angler'}
                </Link>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-cyan-900">—</p>
                <p className="text-xs text-cyan-600">Be the first!</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Community Stats */}
      {(catchCount !== undefined || anglerCount !== undefined) && (
        <div className="flex items-center justify-center gap-6 rounded-lg bg-gray-50 py-3">
          {catchCount !== undefined && catchCount > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <Target className="h-4 w-4" />
              <span className="text-sm">
                <span className="font-semibold text-gray-900">{catchCount}</span> catches logged
              </span>
            </div>
          )}
          {anglerCount !== undefined && anglerCount > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" />
              <span className="text-sm">
                <span className="font-semibold text-gray-900">{anglerCount}</span> anglers
              </span>
            </div>
          )}
        </div>
      )}

      {/* Log Catch Button */}
      {showLogButton && onLogCatch && (
        <button
          type="button"
          onClick={onLogCatch}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          Log a {speciesInfo.commonName} Catch
        </button>
      )}
    </div>
  )
}
