import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { useChallenges, useUserChallenges, useFeaturedChallenge } from '../hooks/useGamification'
import { ChallengeCard } from '../components/gamification/ChallengeCard'
import { XPBar } from '../components/gamification/XPBar'
import { WeeklySpeciesCard } from '../components/gamification/WeeklySpeciesCard'
import { useSessions } from '../hooks/useSessions'
import { SessionCard } from '../components/sessions/SessionCard'
import { Star, Trophy, Fish, MapPin, Target, Zap, Swords, ClipboardList, Plus, Waves, Trees } from 'lucide-react'

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Trophy },
  { id: 'milestones', label: 'Milestones', icon: Target },
  { id: 'species', label: 'Species', icon: Fish },
  { id: 'exploration', label: 'Exploration', icon: MapPin },
  { id: 'skill', label: 'Skill', icon: Zap },
]

type MainTab = 'activity' | 'challenges' | 'compete'
type WaterType = 'saltwater' | 'freshwater'

export default function ChallengeBoardPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<MainTab>('activity')
  const [waterType, setWaterType] = useState<WaterType>('freshwater')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCompleted, setShowCompleted] = useState(true)
  
  // Data hooks
  const { data: sessions, isLoading: sessionsLoading } = useSessions()
  const { data: challenges, isLoading: challengesLoading } = useChallenges(waterType)
  const { data: userChallenges, isLoading: userChallengesLoading } = useUserChallenges()
  const { data: featuredChallenge } = useFeaturedChallenge()
  
  // Create a map of user progress by challenge ID
  const userProgressMap = useMemo(() => {
    const map = new Map()
    userChallenges?.forEach(uc => {
      map.set(uc.challenge_id, uc)
    })
    return map
  }, [userChallenges])
  
  // Filter challenges
  const filteredChallenges = useMemo(() => {
    if (!challenges) return []
    return challenges.filter(c => {
      if (selectedCategory !== 'all' && c.category !== selectedCategory) return false
      if (!showCompleted) {
        const progress = userProgressMap.get(c.id)
        if (progress?.completed_at) return false
      }
      return true
    })
  }, [challenges, selectedCategory, showCompleted, userProgressMap])
  
  // Stats
  const completedCount = userChallenges?.filter(uc => uc.completed_at).length || 0
  const totalCount = challenges?.length || 0
  
  // Main tabs config
  const mainTabs = [
    { id: 'activity' as MainTab, label: 'Activity', icon: ClipboardList },
    { id: 'challenges' as MainTab, label: 'Challenges', icon: Trophy },
    { id: 'compete' as MainTab, label: 'Compete', icon: Swords },
  ]
  
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 text-white px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold">Challenges</h1>
            <div className="text-right">
              <p className="text-xs text-navy-200">Completed</p>
              <p className="text-lg font-bold">{completedCount}/{totalCount}</p>
            </div>
          </div>
          
          {/* XP Bar */}
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <XPBar size="md" />
          </div>
        </div>
        
        {/* Main Tabs */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
                      ? 'border-navy-800 text-navy-800'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
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
          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/sessions/new')}
                  className="flex items-center gap-3 p-3 bg-navy-800 text-white rounded-xl hover:bg-navy-900 transition-colors"
                >
                  <Plus size={20} />
                  <span className="font-medium">Start Session</span>
                </button>
                <button
                  onClick={() => navigate('/catches/new')}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                >
                  <Fish size={20} className="text-navy-800" />
                  <span className="font-medium text-gray-900">Log Catch</span>
                </button>
              </div>
              
              {/* Recent Sessions */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Recent Sessions</h3>
                {sessionsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : sessions && sessions.length > 0 ? (
                  <div className="space-y-3">
                    {sessions.slice(0, 5).map(session => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                    {sessions.length > 5 && (
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full py-2 text-sm text-navy-600 font-medium hover:text-navy-800"
                      >
                        View all {sessions.length} sessions →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white rounded-xl">
                    <ClipboardList size={40} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No sessions yet</p>
                    <button
                      onClick={() => navigate('/sessions/new')}
                      className="mt-3 px-4 py-2 bg-navy-800 text-white text-sm font-medium rounded-lg hover:bg-navy-900"
                    >
                      Start your first session
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* CHALLENGES TAB */}
          {activeTab === 'challenges' && (
            <div className="space-y-4">
              {/* Water Type Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setWaterType('freshwater')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                    waterType === 'freshwater'
                      ? 'bg-white text-navy-800 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Trees size={16} />
                  Freshwater
                </button>
                <button
                  onClick={() => setWaterType('saltwater')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                    waterType === 'saltwater'
                      ? 'bg-white text-navy-800 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Waves size={16} />
                  Saltwater
                </button>
              </div>
              
              {/* Weekly Species Points */}
              <WeeklySpeciesCard waterType={waterType} limit={5} />
              
              {/* Featured Challenge */}
              {featuredChallenge && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={16} className="text-amber-500" fill="currentColor" />
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                      Featured Challenge
                    </span>
                  </div>
                  <ChallengeCard 
                    challenge={featuredChallenge}
                    userProgress={userProgressMap.get(featuredChallenge.id)}
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
                          ? 'bg-navy-800 text-white' 
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
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
                <span className="text-sm text-gray-600">
                  {filteredChallenges.length} challenges
                </span>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="rounded border-gray-300 text-navy-600 focus:ring-navy-500"
                  />
                  Show completed
                </label>
              </div>
              
              {/* Challenge grid */}
              {challengesLoading || userChallengesLoading ? (
                <div className="grid gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredChallenges.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No challenges found</p>
                  {!showCompleted && (
                    <button
                      onClick={() => setShowCompleted(true)}
                      className="mt-2 text-sm text-navy-600 font-medium"
                    >
                      Show completed challenges
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredChallenges.map(challenge => (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      userProgress={userProgressMap.get(challenge.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* COMPETE TAB */}
          {activeTab === 'compete' && (
            <div className="space-y-4">
              {/* Create Competition Button */}
              <button
                onClick={() => navigate('/compete/create')}
                className="w-full flex items-center justify-center gap-2 p-3 bg-navy-800 text-white rounded-xl hover:bg-navy-900 transition-colors"
              >
                <Plus size={20} />
                <span className="font-medium">Create Competition</span>
              </button>
              
              {/* Link to full competitions page */}
              <div className="text-center py-8 bg-white rounded-xl">
                <Swords size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm mb-3">View and join competitions</p>
                <button
                  onClick={() => navigate('/compete')}
                  className="px-4 py-2 bg-navy-800 text-white text-sm font-medium rounded-lg hover:bg-navy-900"
                >
                  Browse Competitions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
