import { ArrowLeft, Camera, MapPin, Clock, Trophy, Shield, Zap, Fish, Sun, Moon, Cloud, Wind, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useXPSettings } from '../hooks/useAppSettings'

/**
 * Challenge Rules Page
 * 
 * Now uses dynamic settings from the database via useXPSettings hook.
 * Values are configured in Admin > Settings > XP & Gamification.
 */

const MIN_SESSION_DURATION_MINS = 15
const PHOTO_GRACE_PERIOD_HOURS = 1

export function ChallengeRulesPage() {
  const navigate = useNavigate()
  const xp = useXPSettings()
  // Species tiers are now configured in admin settings

  if (xp.isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Challenge Rules</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Intro */}
        <div className="rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Trophy size={24} />
            <h2 className="text-lg font-bold">Earn XP & Complete Challenges</h2>
          </div>
          <p className="text-sm text-white/80">
            Log your catches, complete challenges, and climb the leaderboard. 
            Here's everything you need to know about how XP and challenges work.
          </p>
        </div>

        {/* Photo Requirement */}
        <section className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
              <Camera size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Photo Requirement</h3>
              <p className="text-xs text-muted-foreground">Photos prove your catch is real</p>
            </div>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-green-500" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-200">With photo</p>
                <p className="text-green-700 dark:text-green-300">
                  Earn <strong>{xp.tierStandard} XP</strong> (standard species) + bonuses
                </p>
                <p className="text-green-700 dark:text-green-300">✓ All challenges count</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-200">Without photo</p>
                <p className="text-amber-700 dark:text-amber-300">
                  <strong>0 XP</strong> — photos required for XP
                </p>
                <p className="text-amber-700 dark:text-amber-300">✗ No challenge progress</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 p-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-200">{PHOTO_GRACE_PERIOD_HOURS}-hour grace period</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Add a photo within {PHOTO_GRACE_PERIOD_HOURS} hour of logging to get full XP + challenge progress
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Location Challenges */}
        <section className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <MapPin size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Location Challenges</h3>
              <p className="text-xs text-muted-foreground">Explore new fishing spots</p>
            </div>
          </div>
          
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              For challenges like "Fish at 5 different locations", you must:
            </p>
            
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Clock size={16} className="mt-0.5 text-muted-foreground" />
                <span className="text-foreground">
                  Be in an <strong>active session</strong> for at least <strong>{MIN_SESSION_DURATION_MINS} minutes</strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Camera size={16} className="mt-0.5 text-muted-foreground" />
                <span className="text-foreground">
                  Have a <strong>photo</strong> of your catch
                </span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 text-muted-foreground" />
                <span className="text-foreground">
                  Locations within ~1km count as the same spot
                </span>
              </li>
            </ul>
            
            <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong className="text-blue-900 dark:text-blue-200">Why?</strong> This ensures you actually fished at each location rather than just checking in briefly.
              </p>
            </div>
          </div>
        </section>

        {/* XP Breakdown */}
        <section className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/50">
              <Zap size={20} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">XP Breakdown</h3>
              <p className="text-xs text-muted-foreground">How XP is calculated</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Common species</span>
              <span className="font-semibold text-foreground">+{xp.tierCommon} XP</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Standard species</span>
              <span className="font-semibold text-foreground">+{xp.tierStandard} XP</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Trophy species</span>
              <span className="font-semibold text-foreground">+{xp.tierTrophy} XP</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Rare species</span>
              <span className="font-semibold text-foreground">+{xp.tierRare} XP</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">New species (first time)</span>
              <span className="font-semibold text-foreground">+{xp.firstSpeciesBonus} XP</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Personal best</span>
              <span className="font-semibold text-foreground">{xp.pbMultiplier}x multiplier</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Catch & release</span>
              <span className="font-semibold text-foreground">+{xp.releasedBonus} XP</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Full details logged</span>
              <span className="font-semibold text-foreground">+{xp.fullDetailsBonus} XP</span>
            </div>
          </div>
        </section>

        {/* Challenge Types */}
        <section className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
              <Trophy size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Challenge Types</h3>
              <p className="text-xs text-muted-foreground">Different ways to earn rewards</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <Fish size={18} className="mt-0.5 text-blue-500" />
              <div>
                <p className="font-medium text-foreground">Catch Milestones</p>
                <p className="text-muted-foreground">First catch, 10 catches, 50 catches, etc.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <Fish size={18} className="mt-0.5 text-green-500" />
              <div>
                <p className="font-medium text-foreground">Species Collection</p>
                <p className="text-muted-foreground">Catch 5, 10, 25 different species</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <MapPin size={18} className="mt-0.5 text-emerald-500" />
              <div>
                <p className="font-medium text-foreground">Location Explorer</p>
                <p className="text-muted-foreground">Fish at 5, 10, 25 different locations</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <Sun size={18} className="mt-0.5 text-orange-500" />
              <div>
                <p className="font-medium text-foreground">Time-Based</p>
                <p className="text-muted-foreground">Dawn Patrol, Night Owl, Golden Hour</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <Cloud size={18} className="mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Weather Warrior</p>
                <p className="text-muted-foreground">Catch in rain, storms, fog, etc.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <Moon size={18} className="mt-0.5 text-indigo-500" />
              <div>
                <p className="font-medium text-foreground">Moon Phase</p>
                <p className="text-muted-foreground">Full Moon, New Moon catches</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <Wind size={18} className="mt-0.5 text-cyan-500" />
              <div>
                <p className="font-medium text-foreground">Conditions</p>
                <p className="text-muted-foreground">Wind Rider (15+ mph), Specimen Hunter</p>
              </div>
            </div>
          </div>
        </section>

        {/* Anti-Cheat */}
        <section className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
              <Shield size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Fair Play</h3>
              <p className="text-xs text-muted-foreground">Keeping the leaderboard honest</p>
            </div>
          </div>
          
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>To ensure fair competition, we have the following limits:</p>
            
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>Maximum <strong>10 catches per hour</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>Maximum <strong>50 catches per day</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>Photos required for challenge progress</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>Minimum session duration for location challenges</span>
              </li>
            </ul>
            
            <p className="text-xs text-muted-foreground mt-3">
              These rules help ensure everyone competes fairly and that achievements represent real fishing accomplishments.
            </p>
          </div>
        </section>

        {/* Tips */}
        <section className="rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-900/30 dark:to-cyan-900/30 p-5">
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-3">💡 Tips for Maximum XP</h3>
          <ul className="space-y-2 text-sm text-emerald-800 dark:text-emerald-100">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span>Always take a photo of your catch</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span>Weigh your fish for bonus XP</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span>Try new species for the +{xp.firstSpeciesBonus} XP bonus</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span>Fish at different locations to unlock Explorer challenges</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span>Check the weekly bonus species for extra XP</span>
            </li>
          </ul>
        </section>
      </div>
    </main>
  )
}
