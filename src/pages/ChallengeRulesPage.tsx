import { ArrowLeft, Camera, MapPin, Clock, Trophy, Shield, Zap, Fish, Sun, Moon, Cloud, Wind } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Challenge Rules Page
 * 
 * IMPORTANT: Update this page whenever challenge rules or XP values change!
 * Last updated: December 2024
 * 
 * Related files to check when updating:
 * - src/hooks/useCatchXP.ts (XP values, anti-cheat rules)
 * - src/hooks/useGamification.ts (challenge definitions)
 */

// These values should match useCatchXP.ts
const XP_VALUES = {
  BASE_CATCH: 10,
  BASE_CATCH_NO_PHOTO: 3,
  PHOTO_BONUS: 5,
  WEIGHT_BONUS_PER_5LB: 5,
  NEW_SPECIES_BONUS: 25,
}

const MIN_SESSION_DURATION_MINS = 15
const PHOTO_GRACE_PERIOD_HOURS = 1

export function ChallengeRulesPage() {
  const navigate = useNavigate()

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Challenge Rules</h1>
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
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Camera size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Photo Requirement</h3>
              <p className="text-xs text-gray-500">Photos prove your catch is real</p>
            </div>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-lg bg-green-50 p-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-green-500" />
              <div>
                <p className="font-medium text-green-900">With photo</p>
                <p className="text-green-700">
                  {XP_VALUES.BASE_CATCH} base XP + {XP_VALUES.PHOTO_BONUS} photo bonus = <strong>{XP_VALUES.BASE_CATCH + XP_VALUES.PHOTO_BONUS} XP</strong>
                </p>
                <p className="text-green-700">✓ All challenges count</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500" />
              <div>
                <p className="font-medium text-amber-900">Without photo</p>
                <p className="text-amber-700">
                  Only <strong>{XP_VALUES.BASE_CATCH_NO_PHOTO} XP</strong> (reduced)
                </p>
                <p className="text-amber-700">✗ No challenge progress</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
              <div>
                <p className="font-medium text-blue-900">{PHOTO_GRACE_PERIOD_HOURS}-hour grace period</p>
                <p className="text-blue-700">
                  Add a photo within {PHOTO_GRACE_PERIOD_HOURS} hour of logging to get full XP + challenge progress
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Location Challenges */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <MapPin size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Location Challenges</h3>
              <p className="text-xs text-gray-500">Explore new fishing spots</p>
            </div>
          </div>
          
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">
              For challenges like "Fish at 5 different locations", you must:
            </p>
            
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Clock size={16} className="mt-0.5 text-gray-400" />
                <span className="text-gray-700">
                  Be in an <strong>active session</strong> for at least <strong>{MIN_SESSION_DURATION_MINS} minutes</strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Camera size={16} className="mt-0.5 text-gray-400" />
                <span className="text-gray-700">
                  Have a <strong>photo</strong> of your catch
                </span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 text-gray-400" />
                <span className="text-gray-700">
                  Locations within ~1km count as the same spot
                </span>
              </li>
            </ul>
            
            <div className="mt-3 rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">
                <strong>Why?</strong> This ensures you actually fished at each location rather than just checking in briefly.
              </p>
            </div>
          </div>
        </section>

        {/* XP Breakdown */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
              <Zap size={20} className="text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">XP Breakdown</h3>
              <p className="text-xs text-gray-500">How XP is calculated</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Base catch (with photo)</span>
              <span className="font-semibold text-gray-900">+{XP_VALUES.BASE_CATCH} XP</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Base catch (no photo)</span>
              <span className="font-semibold text-amber-600">+{XP_VALUES.BASE_CATCH_NO_PHOTO} XP</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Photo bonus</span>
              <span className="font-semibold text-gray-900">+{XP_VALUES.PHOTO_BONUS} XP</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">New species (first time)</span>
              <span className="font-semibold text-gray-900">+{XP_VALUES.NEW_SPECIES_BONUS} XP</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Weight bonus</span>
              <span className="font-semibold text-gray-900">+{XP_VALUES.WEIGHT_BONUS_PER_5LB} XP per 5lb</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Weekly species bonus</span>
              <span className="font-semibold text-purple-600">Varies</span>
            </div>
          </div>
        </section>

        {/* Challenge Types */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <Trophy size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Challenge Types</h3>
              <p className="text-xs text-gray-500">Different ways to earn rewards</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <Fish size={18} className="mt-0.5 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">Catch Milestones</p>
                <p className="text-gray-500">First catch, 10 catches, 50 catches, etc.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <Fish size={18} className="mt-0.5 text-green-500" />
              <div>
                <p className="font-medium text-gray-900">Species Collection</p>
                <p className="text-gray-500">Catch 5, 10, 25 different species</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <MapPin size={18} className="mt-0.5 text-emerald-500" />
              <div>
                <p className="font-medium text-gray-900">Location Explorer</p>
                <p className="text-gray-500">Fish at 5, 10, 25 different locations</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <Sun size={18} className="mt-0.5 text-orange-500" />
              <div>
                <p className="font-medium text-gray-900">Time-Based</p>
                <p className="text-gray-500">Dawn Patrol, Night Owl, Golden Hour</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <Cloud size={18} className="mt-0.5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">Weather Warrior</p>
                <p className="text-gray-500">Catch in rain, storms, fog, etc.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <Moon size={18} className="mt-0.5 text-indigo-500" />
              <div>
                <p className="font-medium text-gray-900">Moon Phase</p>
                <p className="text-gray-500">Full Moon, New Moon catches</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <Wind size={18} className="mt-0.5 text-cyan-500" />
              <div>
                <p className="font-medium text-gray-900">Conditions</p>
                <p className="text-gray-500">Wind Rider (15+ mph), Specimen Hunter</p>
              </div>
            </div>
          </div>
        </section>

        {/* Anti-Cheat */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Shield size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Fair Play</h3>
              <p className="text-xs text-gray-500">Keeping the leaderboard honest</p>
            </div>
          </div>
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>To ensure fair competition, we have the following limits:</p>
            
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>Maximum <strong>10 catches per hour</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>Maximum <strong>50 catches per day</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>Photos required for challenge progress</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>Minimum session duration for location challenges</span>
              </li>
            </ul>
            
            <p className="text-xs text-gray-500 mt-3">
              These rules help ensure everyone competes fairly and that achievements represent real fishing accomplishments.
            </p>
          </div>
        </section>

        {/* Tips */}
        <section className="rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">💡 Tips for Maximum XP</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Always take a photo of your catch</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Weigh your fish for bonus XP</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Try new species for the +{XP_VALUES.NEW_SPECIES_BONUS} XP bonus</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Fish at different locations to unlock Explorer challenges</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Check the weekly bonus species for extra XP</span>
            </li>
          </ul>
        </section>
      </div>
    </main>
  )
}
