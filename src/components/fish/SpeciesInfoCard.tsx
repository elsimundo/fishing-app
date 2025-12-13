import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Scale, Ruler, MapPin, Calendar, Clock, Trophy, Users, Fish, Anchor, Target, Loader2, Database } from 'lucide-react'
import { getSpeciesInfo, getSpeciesBaits, getSpeciesRigs, getSpeciesLegalSize } from '../../lib/speciesInfo'
import { useAppRecord, useSpeciesCatchCount, useSpeciesAnglerCount } from '../../hooks/useAppRecord'
import { useFishBaseData, formatFishBaseDescription, getFishBaseMaxSize, getFishBaseWaterType } from '../../hooks/useFishBase'
import { useWikidataImage } from '../../hooks/useWikidataImage'
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
  
  // Fetch species image from Wikidata/Wikimedia Commons
  const { data: wikidataImage } = useWikidataImage(speciesName)
  const [imageError, setImageError] = useState(false)
  
  // Fallback to FishBase API if we don't have local data
  const { data: fishBaseData, isLoading: fishBaseLoading } = useFishBaseData(
    !speciesInfo ? speciesName : null
  )

  // If no local data and FishBase is loading
  if (!speciesInfo && fishBaseLoading) {
    return (
      <div className="rounded-xl bg-[#243B4A] border border-[#334155] p-6 text-center">
        <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-[#1BA9A0]" />
        <p className="text-sm text-gray-400">Looking up species data...</p>
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
        {/* Species Image from Wikidata */}
        {wikidataImage?.thumbnailUrl && !imageError && (
          <div className="relative overflow-hidden rounded-xl">
            <img
              src={wikidataImage.thumbnailUrl}
              alt={speciesName}
              className="h-48 w-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <p className="text-xs text-white/70">{wikidataImage.attribution}</p>
            </div>
          </div>
        )}
        
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
            <div className="rounded-lg bg-[#1A2D3D] p-3 text-center">
              <Ruler className="mx-auto mb-1 h-5 w-5 text-gray-500" />
              <p className="text-xs text-gray-500">Max Length</p>
              <p className="text-sm font-semibold text-white">{maxSize.lengthCm} cm</p>
            </div>
          )}
          {maxSize.weightKg && (
            <div className="rounded-lg bg-[#1A2D3D] p-3 text-center">
              <Scale className="mx-auto mb-1 h-5 w-5 text-gray-500" />
              <p className="text-xs text-gray-500">Max Weight</p>
              <p className="text-sm font-semibold text-white">{maxSize.weightKg.toFixed(1)} kg</p>
            </div>
          )}
        </div>

        {/* Water Type */}
        {waterType && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-900/30 border border-blue-500/40 py-2 text-sm text-blue-400">
            <Fish size={16} />
            <span className="capitalize">{waterType === 'both' ? 'Freshwater & Saltwater' : waterType}</span>
          </div>
        )}

        {/* Depth Range */}
        {fishBaseData.species.DepthRangeShallow != null && fishBaseData.species.DepthRangeDeep != null && (
          <div className="flex items-start gap-2 rounded-lg bg-[#1BA9A0]/20 border border-[#1BA9A0]/40 p-3">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1BA9A0]" />
            <div>
              <p className="text-xs font-medium text-[#1BA9A0]">Depth Range</p>
              <p className="text-sm text-[#14B8A6]">
                {fishBaseData.species.DepthRangeShallow} - {fishBaseData.species.DepthRangeDeep} meters
              </p>
            </div>
          </div>
        )}

        {/* App Stats */}
        {((catchCount ?? 0) > 0 || (anglerCount ?? 0) > 0) && (
          <div className="flex items-center justify-center gap-6 rounded-lg bg-[#1A2D3D] py-3">
            {catchCount !== undefined && catchCount > 0 && (
              <div className="flex items-center gap-2 text-gray-400">
                <Target className="h-4 w-4" />
                <span className="text-sm">
                  <span className="font-semibold text-white">{catchCount}</span> catches logged
                </span>
              </div>
            )}
            {anglerCount !== undefined && anglerCount > 0 && (
              <div className="flex items-center gap-2 text-gray-400">
                <Users className="h-4 w-4" />
                <span className="text-sm">
                  <span className="font-semibold text-white">{anglerCount}</span> anglers
                </span>
              </div>
            )}
          </div>
        )}

        {/* Note about data source */}
        <p className="text-center text-xs text-gray-500">
          Data from FishBase.org • Angling-specific info coming soon
        </p>

        {/* Log Catch Button */}
        {showLogButton && onLogCatch && (
          <button
            type="button"
            onClick={onLogCatch}
            className="w-full rounded-xl bg-[#1BA9A0] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#14B8A6]"
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
      <div className="rounded-xl bg-[#243B4A] border border-[#334155] p-4 text-center">
        <Fish className="mx-auto mb-2 h-8 w-8 text-gray-500" />
        <p className="text-sm text-gray-400">No detailed information available for this species yet.</p>
        <p className="mt-1 text-xs text-gray-500">We're constantly adding more species data.</p>
        
        {/* Still allow logging */}
        {showLogButton && onLogCatch && (
          <button
            type="button"
            onClick={onLogCatch}
            className="mt-4 w-full rounded-xl bg-[#1BA9A0] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#14B8A6]"
          >
            Log a {speciesName} Catch
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Species Image from Wikidata */}
      {wikidataImage?.thumbnailUrl && !imageError && (
        <div className="relative overflow-hidden rounded-xl">
          <img
            src={wikidataImage.thumbnailUrl}
            alt={speciesName}
            className="h-48 w-full object-cover"
            onError={() => setImageError(true)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <p className="text-xs text-white/70">{wikidataImage.attribution}</p>
          </div>
        </div>
      )}

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
        <div className="rounded-lg bg-[#1A2D3D] p-3 text-center">
          <Scale className="mx-auto mb-1 h-5 w-5 text-gray-500" />
          <p className="text-xs text-gray-500">Average</p>
          <p className="text-sm font-semibold text-white">
            {speciesInfo.averageWeightKg.min}-{speciesInfo.averageWeightKg.max} kg
          </p>
        </div>
        <div className="rounded-lg bg-amber-900/30 border border-amber-500/40 p-3 text-center">
          <Trophy className="mx-auto mb-1 h-5 w-5 text-amber-400" />
          <p className="text-xs text-amber-400">Trophy</p>
          <p className="text-sm font-semibold text-amber-300">{speciesInfo.trophyWeightKg}+ kg</p>
        </div>
        <div className="rounded-lg bg-[#1A2D3D] p-3 text-center">
          <Ruler className="mx-auto mb-1 h-5 w-5 text-gray-500" />
          <p className="text-xs text-gray-500">Length</p>
          <p className="text-sm font-semibold text-white">
            {speciesInfo.averageLengthCm.min}-{speciesInfo.averageLengthCm.max} cm
          </p>
        </div>
      </div>

      {/* Legal Size Warning */}
      {legalSize?.minLengthCm && (
        <div className="flex items-start gap-3 rounded-lg bg-red-900/30 border border-red-500/40 p-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50">
            <Ruler className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-300">Minimum Legal Size</p>
            <p className="text-lg font-bold text-red-200">{legalSize.minLengthCm} cm</p>
            {legalSize.bagLimitPerDay && (
              <p className="mt-0.5 text-xs text-red-400">Bag limit: {legalSize.bagLimitPerDay} per day</p>
            )}
            {legalSize.notes && (
              <p className="mt-1 text-xs text-red-400">{legalSize.notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Habitat & Timing */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 rounded-lg bg-blue-900/30 border border-blue-500/40 p-3">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
          <div>
            <p className="text-xs font-medium text-blue-300">Habitat</p>
            <p className="text-sm text-blue-400">{speciesInfo.habitat}</p>
          </div>
        </div>
        
        {(speciesInfo.bestSeason || speciesInfo.bestTime) && (
          <div className="grid grid-cols-2 gap-2">
            {speciesInfo.bestSeason && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-900/30 border border-emerald-500/40 p-3">
                <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                <div>
                  <p className="text-xs font-medium text-emerald-300">Best Season</p>
                  <p className="text-xs text-emerald-400">{speciesInfo.bestSeason}</p>
                </div>
              </div>
            )}
            {speciesInfo.bestTime && (
              <div className="flex items-start gap-2 rounded-lg bg-purple-900/30 border border-purple-500/40 p-3">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-400" />
                <div>
                  <p className="text-xs font-medium text-purple-300">Best Time</p>
                  <p className="text-xs text-purple-400">{speciesInfo.bestTime}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Baits & Rigs */}
      {(baits.length > 0 || rigs.length > 0) && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Anchor className="h-4 w-4" />
            Recommended Tackle
          </h4>
          
          {baits.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-400">Baits</p>
              <div className="flex flex-wrap gap-1.5">
                {baits.map((bait) => (
                  <span
                    key={bait}
                    className="rounded-full bg-orange-900/30 border border-orange-500/40 px-2.5 py-1 text-xs font-medium text-orange-400"
                  >
                    {bait}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {rigs.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-400">Rigs</p>
              <div className="flex flex-wrap gap-1.5">
                {rigs.map((rig) => (
                  <span
                    key={rig}
                    className="rounded-full bg-[#334155] px-2.5 py-1 text-xs font-medium text-gray-300"
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
        <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Trophy className="h-4 w-4" />
          Records
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          {/* World Record */}
          {speciesInfo.worldRecord && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-900/30 p-3">
              <p className="text-xs font-medium text-amber-400">🌍 World Record</p>
              <p className="text-lg font-bold text-amber-300">{speciesInfo.worldRecord.weightKg} kg</p>
              <p className="text-xs text-amber-500">
                {speciesInfo.worldRecord.location}, {speciesInfo.worldRecord.year}
              </p>
            </div>
          )}
          
          {/* App Record */}
          <div className="rounded-lg border border-[#1BA9A0]/40 bg-[#1BA9A0]/20 p-3">
            <p className="text-xs font-medium text-[#1BA9A0]">📱 App Record</p>
            {appRecord ? (
              <>
                <p className="text-lg font-bold text-[#14B8A6]">{appRecord.weightKg.toFixed(2)} kg</p>
                <Link 
                  to={`/${appRecord.username}`}
                  className="text-xs text-[#1BA9A0] hover:underline"
                >
                  by @{appRecord.username || 'angler'}
                </Link>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-[#14B8A6]">—</p>
                <p className="text-xs text-[#1BA9A0]">Be the first!</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Community Stats */}
      {(catchCount !== undefined || anglerCount !== undefined) && (
        <div className="flex items-center justify-center gap-6 rounded-lg bg-[#1A2D3D] py-3">
          {catchCount !== undefined && catchCount > 0 && (
            <div className="flex items-center gap-2 text-gray-400">
              <Target className="h-4 w-4" />
              <span className="text-sm">
                <span className="font-semibold text-white">{catchCount}</span> catches logged
              </span>
            </div>
          )}
          {anglerCount !== undefined && anglerCount > 0 && (
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="h-4 w-4" />
              <span className="text-sm">
                <span className="font-semibold text-white">{anglerCount}</span> anglers
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
          className="w-full rounded-xl bg-[#1BA9A0] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#14B8A6]"
        >
          Log a {speciesInfo.commonName} Catch
        </button>
      )}
    </div>
  )
}
