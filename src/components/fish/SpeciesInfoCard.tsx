import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Scale, Ruler, MapPin, Calendar, Clock, Trophy, Users, Fish, Anchor, Target, Loader2, Database } from 'lucide-react'
import { getSpeciesInfo, getSpeciesBaits, getSpeciesRigs, getSpeciesLegalSize } from '../../lib/speciesInfo'
import { useAppRecord, useSpeciesCatchCount, useSpeciesAnglerCount } from '../../hooks/useAppRecord'
import { useFishBaseData, formatFishBaseDescription, getFishBaseMaxSize, getFishBaseWaterType } from '../../hooks/useFishBase'
import { useWikidataImage } from '../../hooks/useWikidataImage'
import type { RegionCode } from '../../types/species'
import { useWeightFormatter } from '../../hooks/useWeightFormatter'
import { Callout, CalloutDescription, CalloutTitle } from '../ui/callout'

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
  const { formatWeight } = useWeightFormatter()

  // If no local data and FishBase is loading
  if (!speciesInfo && fishBaseLoading) {
    return (
      <div className="rounded-xl bg-card border border-border p-6 text-center">
        <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Looking up species data...</p>
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
                <p className="mt-0.5 text-sm italic text-white/70">{fishBaseData.species.sciname}</p>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs">
              <Database size={12} />
              FishBase
            </div>
          </div>
          {description && (
            <p className="mt-2 text-sm text-white/80">{description}</p>
          )}
        </div>

        {/* Quick Stats from FishBase */}
        <div className="grid grid-cols-2 gap-2">
          {maxSize.lengthCm && (
            <div className="rounded-lg bg-background p-3 text-center">
              <Ruler className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Max Length</p>
              <p className="text-sm font-semibold text-foreground">{maxSize.lengthCm} cm</p>
            </div>
          )}
          {maxSize.weightKg && (
            <div className="rounded-lg bg-background p-3 text-center">
              <Scale className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Max Weight</p>
              <p className="text-sm font-semibold text-foreground">
                {formatWeight(maxSize.weightKg, { precision: 1 })}
              </p>
            </div>
          )}
        </div>

        {/* Water Type */}
        {waterType && (
          <Callout variant="info" className="py-2">
            <Fish />
            <CalloutDescription className="capitalize">
              {waterType === 'both' ? 'Freshwater & Saltwater' : waterType}
            </CalloutDescription>
          </Callout>
        )}

        {/* Depth Range */}
        {fishBaseData.species.DepthRangeShallow != null && fishBaseData.species.DepthRangeDeep != null && (
          <Callout variant="neutral" className="border-primary/30 bg-primary/10">
            <MapPin className="text-primary" />
            <CalloutTitle className="text-primary">Depth Range</CalloutTitle>
            <CalloutDescription className="text-primary">
              {fishBaseData.species.DepthRangeShallow} - {fishBaseData.species.DepthRangeDeep} meters
            </CalloutDescription>
          </Callout>
        )}

        {/* App Stats */}
        {((catchCount ?? 0) > 0 || (anglerCount ?? 0) > 0) && (
          <div className="flex items-center justify-center gap-6 rounded-lg bg-background py-3">
            {catchCount !== undefined && catchCount > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span className="text-sm">
                  <span className="font-semibold text-foreground">{catchCount}</span> catches logged
                </span>
              </div>
            )}
            {anglerCount !== undefined && anglerCount > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">
                  <span className="font-semibold text-foreground">{anglerCount}</span> anglers
                </span>
              </div>
            )}
          </div>
        )}

        {/* Note about data source */}
        <p className="text-center text-xs text-muted-foreground">
          Data from FishBase.org • Angling-specific info coming soon
        </p>

        {/* Log Catch Button */}
        {showLogButton && onLogCatch && (
          <button
            type="button"
            onClick={onLogCatch}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:bg-primary/60"
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
      <div className="rounded-xl bg-card border border-border p-4 text-center">
        <Fish className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No detailed information available for this species yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">We're constantly adding more species data.</p>
        
        {/* Still allow logging */}
        {showLogButton && onLogCatch && (
          <button
            type="button"
            onClick={onLogCatch}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:bg-primary/60"
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
        <div className="rounded-lg bg-background p-3 text-center">
          <Scale className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Average</p>
          <p className="text-sm font-semibold text-foreground">
            {speciesInfo.averageWeightKg.min}-{speciesInfo.averageWeightKg.max} kg
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-500/40 p-3 text-center">
          <Trophy className="mx-auto mb-1 h-5 w-5 text-amber-500 dark:text-amber-400" />
          <p className="text-xs text-amber-600 dark:text-amber-400">Trophy</p>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{speciesInfo.trophyWeightKg}+ kg</p>
        </div>
        <div className="rounded-lg bg-background p-3 text-center">
          <Ruler className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Length</p>
          <p className="text-sm font-semibold text-foreground">
            {speciesInfo.averageLengthCm.min}-{speciesInfo.averageLengthCm.max} cm
          </p>
        </div>
      </div>

      {/* Legal Size Warning */}
      {legalSize?.minLengthCm && (
        <Callout variant="danger">
          <Ruler />
          <CalloutTitle>Minimum Legal Size</CalloutTitle>
          <CalloutDescription>
            <p className="text-lg font-bold">{legalSize.minLengthCm} cm</p>
            {legalSize.bagLimitPerDay && (
              <p className="mt-0.5 text-xs">Bag limit: {legalSize.bagLimitPerDay} per day</p>
            )}
            {legalSize.notes && (
              <p className="mt-1 text-xs">{legalSize.notes}</p>
            )}
          </CalloutDescription>
        </Callout>
      )}

      {/* Habitat & Timing */}
      <div className="space-y-2">
        <Callout variant="info">
          <MapPin />
          <CalloutTitle>Habitat</CalloutTitle>
          <CalloutDescription>{speciesInfo.habitat}</CalloutDescription>
        </Callout>
        
        {(speciesInfo.bestSeason || speciesInfo.bestTime) && (
          <div className="grid grid-cols-2 gap-2">
            {speciesInfo.bestSeason && (
              <Callout variant="success" className="py-3">
                <Calendar />
                <CalloutTitle>Best Season</CalloutTitle>
                <CalloutDescription>{speciesInfo.bestSeason}</CalloutDescription>
              </Callout>
            )}
            {speciesInfo.bestTime && (
              <Callout variant="info" className="py-3">
                <Clock />
                <CalloutTitle>Best Time</CalloutTitle>
                <CalloutDescription>{speciesInfo.bestTime}</CalloutDescription>
              </Callout>
            )}
          </div>
        )}
      </div>

      {/* Baits & Rigs */}
      {(baits.length > 0 || rigs.length > 0) && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Anchor className="h-4 w-4" />
            Recommended Tackle
          </h4>
          
          {baits.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Baits</p>
              <div className="flex flex-wrap gap-1.5">
                {baits.map((bait) => (
                  <span
                    key={bait}
                    className="rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-500/40 px-2.5 py-1 text-xs font-medium text-orange-600 dark:text-orange-400"
                  >
                    {bait}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {rigs.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Rigs</p>
              <div className="flex flex-wrap gap-1.5">
                {rigs.map((rig) => (
                  <span
                    key={rig}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
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
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Trophy className="h-4 w-4" />
          Records
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          {/* World Record */}
          {speciesInfo.worldRecord && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/30 p-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">🌍 World Record</p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{speciesInfo.worldRecord.weightKg} kg</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                {speciesInfo.worldRecord.location}, {speciesInfo.worldRecord.year}
              </p>
            </div>
          )}
          
          {/* App Record */}
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
            <p className="text-xs font-medium text-primary">📱 App Record</p>
            {appRecord ? (
              <>
                <p className="text-lg font-bold text-primary">{appRecord.weightKg.toFixed(2)} kg</p>
                <Link 
                  to={`/${appRecord.username}`}
                  className="text-xs text-primary hover:underline"
                >
                  by @{appRecord.username || 'angler'}
                </Link>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-primary">—</p>
                <p className="text-xs text-primary">Be the first!</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Community Stats */}
      {(catchCount !== undefined || anglerCount !== undefined) && (
        <div className="flex items-center justify-center gap-6 rounded-lg bg-background py-3">
          {catchCount !== undefined && catchCount > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-sm">
                <span className="font-semibold text-foreground">{catchCount}</span> catches logged
              </span>
            </div>
          )}
          {anglerCount !== undefined && anglerCount > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">
                <span className="font-semibold text-foreground">{anglerCount}</span> anglers
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
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:bg-primary/60"
        >
          Log a {speciesInfo.commonName} Catch
        </button>
      )}
    </div>
  )
}
