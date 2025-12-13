import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Search, Trophy, Globe, Flag, Calendar, Eye, EyeOff, Edit2, Save, X, Users, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getCountryFlag, getCountryName } from '../../utils/reverseGeocode'

type ChallengeScope = 'global' | 'country' | 'region' | 'event'
type ChallengeFilter = 'all' | 'global' | 'country' | 'event' | 'inactive'

interface Challenge {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  category: string
  difficulty: string
  xp_reward: number
  is_active: boolean
  scope: ChallengeScope
  scope_value: string | null
  starts_at: string | null
  ends_at: string | null
  water_type: string | null
  sort_order: number
  created_at: string
  // Computed
  completions_count?: number
}

export default function ChallengesPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<ChallengeFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<Challenge>>({})

  // Fetch all challenges with completion counts
  const { data: challenges, isLoading } = useQuery({
    queryKey: ['admin-challenges'],
    queryFn: async () => {
      const { data: challengesData, error } = await supabase
        .from('challenges')
        .select('*')
        .order('scope')
        .order('sort_order')

      if (error) throw error

      // Get completion counts for each challenge
      const { data: completions } = await supabase
        .from('user_challenges')
        .select('challenge_id')
        .not('completed_at', 'is', null)

      const completionCounts: Record<string, number> = {}
      completions?.forEach(c => {
        completionCounts[c.challenge_id] = (completionCounts[c.challenge_id] || 0) + 1
      })

      return (challengesData || []).map(c => ({
        ...c,
        completions_count: completionCounts[c.id] || 0,
      })) as Challenge[]
    },
  })

  // Toggle challenge active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('challenges')
        .update({ is_active })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] })
      toast.success(is_active ? 'Challenge activated' : 'Challenge deactivated')
    },
    onError: () => {
      toast.error('Failed to update challenge')
    },
  })

  // Update challenge
  const updateChallenge = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Challenge> }) => {
      const { error } = await supabase
        .from('challenges')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] })
      setEditingId(null)
      setEditValues({})
      toast.success('Challenge updated')
    },
    onError: () => {
      toast.error('Failed to update challenge')
    },
  })

  // Filter challenges
  const filteredChallenges = challenges?.filter(c => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      if (!c.title.toLowerCase().includes(search) && 
          !c.slug.toLowerCase().includes(search) &&
          !c.description.toLowerCase().includes(search)) {
        return false
      }
    }

    // Category filter
    switch (filter) {
      case 'global':
        return c.scope === 'global'
      case 'country':
        return c.scope === 'country'
      case 'event':
        return c.scope === 'event'
      case 'inactive':
        return !c.is_active
      default:
        return true
    }
  })

  // Group by scope for display
  const groupedChallenges = filteredChallenges?.reduce((acc, c) => {
    const key = c.scope === 'country' ? `country_${c.scope_value}` : c.scope
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {} as Record<string, Challenge[]>)

  const getScopeLabel = (key: string) => {
    if (key === 'global') return '🌐 Global Challenges'
    if (key === 'event') return '🌍 Multi-Country Events'
    if (key.startsWith('country_')) {
      const code = key.replace('country_', '')
      return `${getCountryFlag(code)} ${getCountryName(code)} Challenges`
    }
    return key
  }

  const filters: { id: ChallengeFilter; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All', icon: Trophy },
    { id: 'global', label: 'Global', icon: Globe },
    { id: 'country', label: 'Country', icon: Flag },
    { id: 'event', label: 'Events', icon: Calendar },
    { id: 'inactive', label: 'Inactive', icon: EyeOff },
  ]

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Challenges</h1>
            <p className="text-sm text-muted-foreground">
              Manage global and country-specific challenges
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <div className="rounded-lg bg-blue-50 px-3 py-2">
              <span className="font-semibold text-blue-700">{challenges?.length || 0}</span>
              <span className="ml-1 text-blue-600">Total</span>
            </div>
            <div className="rounded-lg bg-green-50 px-3 py-2">
              <span className="font-semibold text-green-700">
                {challenges?.filter(c => c.is_active).length || 0}
              </span>
              <span className="ml-1 text-green-600">Active</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {filters.map(f => {
            const Icon = f.icon
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  filter === f.id
                    ? 'bg-navy-800 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon size={16} />
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search challenges..."
              className="w-full rounded-lg border border-border bg-background text-foreground py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Challenges List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : !filteredChallenges?.length ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Trophy size={48} className="mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No challenges found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedChallenges || {}).map(([key, group]) => (
              <div key={key} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border bg-muted px-4 py-3">
                  <h2 className="font-semibold text-foreground">{getScopeLabel(key)}</h2>
                </div>
                <div className="divide-y divide-border">
                  {group.map(challenge => (
                    <ChallengeRow
                      key={challenge.id}
                      challenge={challenge}
                      isEditing={editingId === challenge.id}
                      editValues={editValues}
                      onEdit={() => {
                        setEditingId(challenge.id)
                        setEditValues({
                          title: challenge.title,
                          description: challenge.description,
                          xp_reward: challenge.xp_reward,
                        })
                      }}
                      onCancelEdit={() => {
                        setEditingId(null)
                        setEditValues({})
                      }}
                      onSaveEdit={() => {
                        updateChallenge.mutate({
                          id: challenge.id,
                          updates: editValues,
                        })
                      }}
                      onEditChange={(field, value) => {
                        setEditValues(prev => ({ ...prev, [field]: value }))
                      }}
                      onToggleActive={() => {
                        toggleActive.mutate({
                          id: challenge.id,
                          is_active: !challenge.is_active,
                        })
                      }}
                      isUpdating={toggleActive.isPending || updateChallenge.isPending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

interface ChallengeRowProps {
  challenge: Challenge
  isEditing: boolean
  editValues: Partial<Challenge>
  onEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onEditChange: (field: string, value: any) => void
  onToggleActive: () => void
  isUpdating: boolean
}

function ChallengeRow({
  challenge,
  isEditing,
  editValues,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
  onToggleActive,
  isUpdating,
}: ChallengeRowProps) {
  return (
    <div className={`p-4 ${!challenge.is_active ? 'bg-muted opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xl">
          {challenge.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editValues.title || ''}
                onChange={(e) => onEditChange('title', e.target.value)}
                className="w-full rounded border border-border bg-background text-foreground px-2 py-1 text-sm font-semibold"
              />
              <textarea
                value={editValues.description || ''}
                onChange={(e) => onEditChange('description', e.target.value)}
                className="w-full rounded border border-border bg-background text-foreground px-2 py-1 text-xs"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">XP:</label>
                <input
                  type="number"
                  value={editValues.xp_reward || 0}
                  onChange={(e) => onEditChange('xp_reward', parseInt(e.target.value))}
                  className="w-20 rounded border border-border bg-background text-foreground px-2 py-1 text-xs"
                />
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-foreground">{challenge.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{challenge.description}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                <span className="rounded bg-purple-100 px-1.5 py-0.5 font-medium text-purple-700">
                  {challenge.xp_reward} XP
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                  {challenge.difficulty}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                  {challenge.category}
                </span>
                {challenge.water_type && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                    {challenge.water_type}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <Users size={14} />
          <span>{challenge.completions_count} completed</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={onSaveEdit}
                disabled={isUpdating}
                className="rounded-lg p-2 text-green-600 hover:bg-green-100"
                title="Save"
              >
                <Save size={16} />
              </button>
              <button
                onClick={onCancelEdit}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={onToggleActive}
                disabled={isUpdating}
                className={`rounded-lg p-2 ${
                  challenge.is_active
                    ? 'text-green-600 hover:bg-green-100'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
                title={challenge.is_active ? 'Deactivate' : 'Activate'}
              >
                {challenge.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
