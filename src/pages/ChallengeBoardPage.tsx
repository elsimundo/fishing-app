import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { useChallenges, useUserChallenges, useFeaturedChallenge, useWeeklyLeaderboard, useUserCountries } from '../hooks/useGamification'
import { useActiveCompetitions, useMyEnteredCompetitions } from '../hooks/useCompetitions'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { ChallengeCard } from '../components/gamification/ChallengeCard'
import { XPBar } from '../components/gamification/XPBar'
import { WeeklySpeciesBadge } from '../components/gamification/WeeklySpeciesCard'
import { CompetitionCard } from '../components/compete/CompetitionCard'
import { CompetitionCardSkeleton } from '../components/skeletons/CompetitionCardSkeleton'
import { Star, Trophy, Fish, MapPin, Target, Zap, Swords, ClipboardList, Plus, Waves, Trees, HelpCircle, Globe, Flag, ChevronDown, ChevronUp } from 'lucide-react'
import type { Challenge, UserChallenge } from '../hooks/useGamification'
import { getCountryFlag, getCountryName } from '../utils/reverseGeocode'

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Trophy },
  { id: 'milestones', label: 'Milestones', icon: Target },
  { id: 'species', label: 'Species', icon: Fish },
  { id: 'exploration', label: 'Exploration', icon: MapPin },
  { id: 'skill', label: 'Skill', icon: Zap },
]

type MainTab = 'challenges' | 'leaderboards' | 'compete'
type WaterType = 'saltwater' | 'freshwater'
type ScopeTab = 'all' | 'global' | 'countries' | 'events'

export default function ChallengeBoardPage() {
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  
  // Determine default water type from user's fishing preference
  const getDefaultWaterType = (): WaterType => {
    if (profile?.fishing_preference === 'sea') return 'saltwater'
    if (profile?.fishing_preference === 'freshwater') return 'freshwater'
    return 'saltwater' // Default to saltwater for 'both' or undefined
  }
  
  const [activeTab, setActiveTab] = useState<MainTab>('challenges')
  const [waterType, setWaterType] = useState<WaterType>(getDefaultWaterType())
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCompleted, setShowCompleted] = useState(true)
  const [scopeTab, setScopeTab] = useState<ScopeTab>('all')
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [hasSetInitialWaterType, setHasSetInitialWaterType] = useState(false)
  
  // Set water type from profile preference once loaded
  useEffect(() => {
    if (profile?.fishing_preference && !hasSetInitialWaterType) {
      if (profile.fishing_preference === 'sea') {
        setWaterType('saltwater')
      } else if (profile.fishing_preference === 'freshwater') {
        setWaterType('freshwater')
      }
      // For 'both', keep whatever is currently selected
      setHasSetInitialWaterType(true)
    }
  }, [profile?.fishing_preference, hasSetInitialWaterType])
  
  // Data hooks
  const { data: challenges, isLoading: challengesLoading } = useChallenges({ waterType })
  const { data: userChallenges, isLoading: userChallengesLoading } = useUserChallenges()
  const { data: featuredChallenge } = useFeaturedChallenge()
  const { data: userCountries } = useUserCountries()
  const {
    data: allActiveCompetitions,
    isLoading: activeCompetitionsLoading,
  } = useActiveCompetitions()
  const {
    data: enteredCompetitions,
    isLoading: enteredCompetitionsLoading,
  } = useMyEnteredCompetitions()
  
  // Create a map of user progress by challenge ID
  const userProgressMap = useMemo(() => {
    const map = new Map()
    userChallenges?.forEach(uc => {
      map.set(uc.challenge_id, uc)
    })
    return map
  }, [userChallenges])
  
  // Filter challenges by scope, category, and completion status
  const filteredChallenges = useMemo(() => {
    if (!challenges) return []
    return challenges.filter(c => {
      // Scope filter
      if (scopeTab === 'global' && c.scope !== 'global') return false
      if (scopeTab === 'countries') {
        if (c.scope !== 'country') return false
        // If a specific country is selected, filter to that country
        if (selectedCountry && c.scope_value !== selectedCountry) return false
      }
      if (scopeTab === 'events' && c.scope !== 'event') return false
      
      // Category filter
      if (selectedCategory !== 'all' && c.category !== selectedCategory) return false
      
      // Completion filter
      if (!showCompleted) {
        const progress = userProgressMap.get(c.id)
        if (progress?.completed_at) return false
      }
      return true
    })
  }, [challenges, selectedCategory, showCompleted, userProgressMap, scopeTab, selectedCountry])
  
  // Stats
  const completedCount = userChallenges?.filter(uc => uc.completed_at).length || 0
  const totalCount = challenges?.length || 0
  const yourCompetitions = enteredCompetitions || []
  const availableCompetitions = (allActiveCompetitions || []).filter(
    comp => !yourCompetitions.some(entered => entered.id === comp.id)
  )
  const competitionsLoading = activeCompetitionsLoading || enteredCompetitionsLoading
  
  // Main tabs config
  const mainTabs = [
    { id: 'challenges' as MainTab, label: 'Challenges', icon: Trophy },
    { id: 'leaderboards' as MainTab, label: 'Leaderboards', icon: ClipboardList },
    { id: 'compete' as MainTab, label: 'Compete', icon: Swords },
  ]

  // Leaderboard data from Supabase
  const { data: weeklyLeaderboard, isLoading: leaderboardLoading } = useWeeklyLeaderboard(20)
  const { user } = useAuth()
  
  return (
    <Layout>
      <div className="min-h-screen bg-[#1A2D3D] pb-24">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0D4B4E] to-[#1A2D3D] text-white px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold">Challenges</h1>
            <div className="text-right">
              <p className="text-xs text-gray-400">Completed</p>
              <p className="text-lg font-bold">{completedCount}/{totalCount}</p>
            </div>
          </div>
          
          {/* XP Bar */}
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <XPBar size="md" />
          </div>

          {/* Rules Link */}
          <button
            onClick={() => navigate('/challenges/rules')}
            className="mt-2 flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
          >
            <HelpCircle size={14} />
            <span>View challenge rules & XP guide</span>
          </button>

          {/* Weekly species XP badge */}
          <div className="mt-2">
            <WeeklySpeciesBadge waterType={waterType} />
          </div>
        </div>
        
        {/* Main Tabs */}
        <div className="bg-[#243B4A] border-b border-[#334155] sticky top-0 z-10">
          <div className="flex">
            {mainTabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-[#1BA9A0] text-[#1BA9A0]'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="px-4 pt-4">
          {/* CHALLENGES TAB */}
          {activeTab === 'challenges' && (
            <div className="space-y-4">
              {/* Water Type Toggle - only show if user fishes both or has no preference */}
              {(!profile?.fishing_preference || profile.fishing_preference === 'both') && (
                <div className="flex bg-[#243B4A] rounded-xl p-1 border border-[#334155]">
                  <button
                    onClick={() => setWaterType('freshwater')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                      waterType === 'freshwater'
                        ? 'bg-[#1A2D3D] text-[#1BA9A0] shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Trees size={16} />
                    Freshwater
                  </button>
                  <button
                    onClick={() => setWaterType('saltwater')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                      waterType === 'saltwater'
                        ? 'bg-[#1A2D3D] text-[#1BA9A0] shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Waves size={16} />
                    Saltwater
                  </button>
                </div>
              )}

              {/* Scope Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => { setScopeTab('all'); setSelectedCountry(null) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    scopeTab === 'all'
                      ? 'bg-[#1BA9A0] text-white'
                      : 'bg-[#243B4A] text-gray-400 border border-[#334155] hover:border-[#1BA9A0]'
                  }`}
                >
                  <Trophy size={14} />
                  All
                </button>
                <button
                  onClick={() => { setScopeTab('global'); setSelectedCountry(null) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    scopeTab === 'global'
                      ? 'bg-[#1BA9A0] text-white'
                      : 'bg-[#243B4A] text-gray-400 border border-[#334155] hover:border-[#1BA9A0]'
                  }`}
                >
                  <Globe size={14} />
                  Global
                </button>
                
                {/* User's countries */}
                {userCountries && userCountries.length > 0 && (
                  <>
                    {userCountries.slice(0, 3).map(({ code, count }) => (
                      <button
                        key={code}
                        onClick={() => { setScopeTab('countries'); setSelectedCountry(code) }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                          scopeTab === 'countries' && selectedCountry === code
                            ? 'bg-[#1BA9A0] text-white'
                            : 'bg-[#243B4A] text-gray-400 border border-[#334155] hover:border-[#1BA9A0]'
                        }`}
                      >
                        <span>{getCountryFlag(code)}</span>
                        {getCountryName(code)}
                        <span className="text-xs opacity-70">({count})</span>
                      </button>
                    ))}
                  </>
                )}
                
                {/* All countries button if user has fished in multiple */}
                {userCountries && userCountries.length > 1 && (
                  <button
                    onClick={() => { setScopeTab('countries'); setSelectedCountry(null) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      scopeTab === 'countries' && !selectedCountry
                        ? 'bg-[#1BA9A0] text-white'
                        : 'bg-[#243B4A] text-gray-400 border border-[#334155] hover:border-[#1BA9A0]'
                    }`}
                  >
                    <Flag size={14} />
                    All Countries
                  </button>
                )}
                
                <button
                  onClick={() => { setScopeTab('events'); setSelectedCountry(null) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    scopeTab === 'events'
                      ? 'bg-[#1BA9A0] text-white'
                      : 'bg-[#243B4A] text-gray-400 border border-[#334155] hover:border-[#1BA9A0]'
                  }`}
                >
                  🌍
                  Events
                </button>
              </div>
              
              {/* Featured Challenge */}
              {featuredChallenge && (
                <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/20 rounded-xl p-4 border-2 border-amber-500/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={16} className="text-amber-400" fill="currentColor" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      Featured Challenge
                    </span>
                  </div>
                  <ChallengeCard 
                    challenge={featuredChallenge}
                    userProgress={userProgressMap.get(featuredChallenge.id)}
                    onClick={() => navigate(`/challenges/${featuredChallenge.slug}`)}
                  />
                </div>
              )}
              
              {/* Category filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon
                  const isActive = selectedCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        isActive 
                          ? 'bg-[#1BA9A0] text-white' 
                          : 'bg-[#243B4A] text-gray-400 border border-[#334155] hover:border-[#1BA9A0]'
                      }`}
                    >
                      <Icon size={14} />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
              
              {/* Show completed toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  {filteredChallenges.length} challenges
                </span>
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="rounded border-[#334155] bg-[#1A2D3D] text-[#1BA9A0] focus:ring-[#1BA9A0]"
                  />
                  Show completed
                </label>
              </div>
              
              {/* Challenge sections grouped by scope */}
              {challengesLoading || userChallengesLoading ? (
                <div className="grid gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 bg-[#243B4A] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredChallenges.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy size={48} className="mx-auto text-gray-500 mb-3" />
                  <p className="text-gray-400">No challenges found</p>
                  {!showCompleted && (
                    <button
                      onClick={() => setShowCompleted(true)}
                      className="mt-2 text-sm text-[#1BA9A0] font-medium"
                    >
                      Show completed challenges
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Group challenges by scope */}
                  {(() => {
                    // Group challenges
                    const groups: Record<string, typeof filteredChallenges> = {}
                    filteredChallenges.forEach(c => {
                      const key = c.scope === 'country' ? `country_${c.scope_value}` : c.scope
                      if (!groups[key]) groups[key] = []
                      groups[key].push(c)
                    })
                    
                    const getSectionTitle = (key: string) => {
                      if (key === 'global') return { icon: '🌐', title: 'Global Challenges', subtitle: 'Available everywhere' }
                      if (key === 'event') return { icon: '🌍', title: 'World Events', subtitle: 'Multi-country achievements' }
                      if (key.startsWith('country_')) {
                        const code = key.replace('country_', '')
                        return { 
                          icon: getCountryFlag(code), 
                          title: `${getCountryName(code)} Challenges`,
                          subtitle: `Fish in ${getCountryName(code)} to progress`
                        }
                      }
                      return { icon: '🏆', title: 'Challenges', subtitle: '' }
                    }
                    
                    // Sort: global first, then countries alphabetically, then events
                    const sortedKeys = Object.keys(groups).sort((a, b) => {
                      if (a === 'global') return -1
                      if (b === 'global') return 1
                      if (a === 'event') return 1
                      if (b === 'event') return -1
                      return a.localeCompare(b)
                    })
                    
                    return sortedKeys.map(key => {
                      const section = getSectionTitle(key)
                      const challenges = groups[key]
                      const completedInSection = challenges.filter(c => userProgressMap.get(c.id)?.completed_at).length
                      
                      return (
                        <ChallengeSection
                          key={key}
                          icon={section.icon}
                          title={section.title}
                          subtitle={section.subtitle}
                          completedCount={completedInSection}
                          totalCount={challenges.length}
                          challenges={challenges}
                          userProgressMap={userProgressMap}
                          onChallengeClick={(slug) => navigate(`/challenges/${slug}`)}
                        />
                      )
                    })
                  })()}
                </div>
              )}
            </div>
          )}
          
          {/* LEADERBOARDS TAB */}
          {activeTab === 'leaderboards' && (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="rounded-lg bg-blue-900/30 px-3 py-2 text-xs text-blue-400">
                <p className="font-medium">📊 Global leaderboard</p>
                <p className="mt-0.5 text-blue-500">Showing top anglers by XP earned this week. Resets every Monday.</p>
              </div>

              {/* XP Leaderboard */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-900/30">
                    <Trophy size={14} className="text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Top anglers this week</h3>
                </div>

                {leaderboardLoading ? (
                  <div className="rounded-2xl border border-[#334155] bg-[#243B4A] p-8 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#334155] border-t-[#1BA9A0]" />
                    <p className="mt-2 text-xs text-gray-500">Loading leaderboard...</p>
                  </div>
                ) : !weeklyLeaderboard || weeklyLeaderboard.length === 0 ? (
                  <div className="rounded-2xl border border-[#334155] bg-[#243B4A] p-8 text-center">
                    <Trophy size={32} className="mx-auto text-gray-500" />
                    <p className="mt-2 text-sm font-medium text-white">No data yet</p>
                    <p className="text-xs text-gray-500">Start fishing to appear on the leaderboard!</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#334155] bg-[#243B4A]">
                    <ul className="divide-y divide-[#334155]">
                      {weeklyLeaderboard.map((entry) => {
                        const isYou = user?.id === entry.user_id
                        return (
                          <li
                            key={entry.user_id}
                            className={`flex items-center gap-3 px-3 py-2.5 text-xs sm:text-sm ${
                              entry.rank === 1
                                ? 'bg-amber-900/20'
                                : isYou
                                  ? 'bg-[#1BA9A0]/10'
                                  : ''
                            }`}
                          >
                            <div className="flex w-8 justify-center">
                              <span
                                className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full text-[11px] font-semibold ${
                                  entry.rank === 1
                                    ? 'bg-amber-500 text-white'
                                    : entry.rank === 2
                                      ? 'bg-gray-500 text-white'
                                      : entry.rank === 3
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-[#334155] text-gray-300'
                                }`}
                              >
                                #{entry.rank}
                              </span>
                            </div>

                            <div className="flex flex-1 items-center gap-2">
                              <img
                                src={entry.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${entry.username}`}
                                alt={entry.display_name || entry.username}
                                className="h-8 w-8 rounded-full bg-[#1A2D3D] object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="truncate text-xs font-semibold text-white sm:text-sm">
                                    {entry.display_name || entry.username}
                                  </p>
                                  {isYou && (
                                    <span className="rounded-full bg-[#1BA9A0]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#1BA9A0]">
                                      You
                                    </span>
                                  )}
                                </div>
                                <p className="truncate text-[11px] text-gray-500">
                                  Level {entry.level}
                                </p>
                              </div>

                              <div className="text-right text-[11px] sm:text-xs">
                                <p className="font-semibold text-emerald-400">
                                  {entry.xp.toLocaleString()} XP
                                </p>
                                <p className="text-[11px] text-gray-500">{entry.species_points} species pts</p>
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </section>

              {/* Top species hunters */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-900/30">
                    <Star size={14} className="text-amber-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Top species hunters</h3>
                </div>

                {leaderboardLoading ? (
                  <div className="rounded-2xl border border-[#334155] bg-[#243B4A] p-6 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-[#334155] border-t-amber-500" />
                  </div>
                ) : !weeklyLeaderboard || weeklyLeaderboard.length === 0 ? (
                  <div className="rounded-2xl border border-[#334155] bg-[#243B4A] p-6 text-center">
                    <Star size={24} className="mx-auto text-gray-500" />
                    <p className="mt-1 text-xs text-gray-500">No data yet</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#334155] bg-[#243B4A]">
                    <ul className="divide-y divide-[#334155]">
                      {[...weeklyLeaderboard]
                        .sort((a, b) => b.species_points - a.species_points)
                        .slice(0, 5)
                        .map((entry, index) => {
                          const isYou = user?.id === entry.user_id
                          return (
                            <li key={entry.user_id} className="flex items-center gap-3 px-3 py-2.5 text-xs sm:text-sm">
                              <div className="flex w-8 justify-center">
                                <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-amber-900/30 text-[11px] font-semibold text-amber-400">
                                  #{index + 1}
                                </span>
                              </div>
                              <div className="flex flex-1 items-center gap-2">
                                <img
                                  src={entry.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${entry.username}`}
                                  alt={entry.display_name || entry.username}
                                  className="h-8 w-8 rounded-full bg-[#1A2D3D] object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <p className="truncate text-xs font-semibold text-white sm:text-sm">
                                      {entry.display_name || entry.username}
                                    </p>
                                    {isYou && (
                                      <span className="rounded-full bg-[#1BA9A0]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#1BA9A0]">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <p className="truncate text-[11px] text-gray-500">Level {entry.level}</p>
                                </div>
                                <div className="text-right text-[11px] sm:text-xs">
                                  <p className="font-semibold text-amber-400">{entry.species_points} pts</p>
                                  <p className="text-[11px] text-gray-500">{entry.xp.toLocaleString()} XP</p>
                                </div>
                              </div>
                            </li>
                          )
                        })}
                    </ul>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* COMPETE TAB */}
          {activeTab === 'compete' && (
            <div className="space-y-4">
              {/* Create Competition Button */}
              <button
                onClick={() => navigate('/compete/create')}
                className="w-full flex items-center justify-center gap-2 p-3 bg-[#1BA9A0] text-white rounded-xl hover:bg-[#14B8A6] transition-colors"
              >
                <Plus size={20} />
                <span className="font-medium">Create Competition</span>
              </button>

              {/* Your Competitions */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-900/30">
                    <Trophy size={14} className="text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Your Competitions</h3>
                  {yourCompetitions.length > 0 && (
                    <span className="rounded-full bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      {yourCompetitions.length}
                    </span>
                  )}
                </div>
                {competitionsLoading ? (
                  <div className="space-y-3">
                    <CompetitionCardSkeleton />
                    <CompetitionCardSkeleton />
                  </div>
                ) : yourCompetitions.length > 0 ? (
                  <div className="space-y-3">
                    {yourCompetitions.map((competition) => (
                      <CompetitionCard key={competition.id} competition={competition} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#334155] bg-[#243B4A] p-6 text-center">
                    <p className="text-sm font-semibold text-white">No active competitions</p>
                    <p className="text-xs text-gray-500">Join one below to get started</p>
                  </div>
                )}
              </section>

              {/* Available Competitions */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-900/30">
                    <Target size={14} className="text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Available to Join</h3>
                  {availableCompetitions.length > 0 && (
                    <span className="rounded-full bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-400">
                      {availableCompetitions.length}
                    </span>
                  )}
                </div>
                {competitionsLoading ? (
                  <div className="space-y-3">
                    <CompetitionCardSkeleton />
                    <CompetitionCardSkeleton />
                  </div>
                ) : availableCompetitions.length > 0 ? (
                  <div className="space-y-3">
                    {availableCompetitions.map((competition) => (
                      <CompetitionCard key={competition.id} competition={competition} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#334155] bg-[#243B4A] p-6 text-center">
                    <p className="text-sm font-semibold text-white">No competitions available</p>
                    <p className="text-xs text-gray-500">Check back soon or create your own</p>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

// Collapsible challenge section component
interface ChallengeSectionProps {
  icon: string
  title: string
  subtitle: string
  completedCount: number
  totalCount: number
  challenges: Challenge[]
  userProgressMap: Map<string, UserChallenge>
  onChallengeClick: (slug: string) => void
}

function ChallengeSection({
  icon,
  title,
  subtitle,
  completedCount,
  totalCount,
  challenges,
  userProgressMap,
  onChallengeClick,
}: ChallengeSectionProps) {
  const [expanded, setExpanded] = useState(true)
  const allCompleted = completedCount === totalCount && totalCount > 0
  
  return (
    <div className="rounded-xl border border-[#334155] bg-[#243B4A] overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#1A2D3D] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">{title}</h3>
              {allCompleted && (
                <span className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                  ✓ Complete
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{completedCount}/{totalCount}</p>
            <p className="text-[10px] text-gray-500">completed</p>
          </div>
          {expanded ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </div>
      </button>
      
      {/* Challenges List */}
      {expanded && (
        <div className="border-t border-[#334155] p-3 space-y-2">
          {challenges.map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              userProgress={userProgressMap.get(challenge.id)}
              onClick={() => onChallengeClick(challenge.slug)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
