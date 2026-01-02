import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Layout } from '../components/layout/Layout'
import { ArrowLeft, TrendingUp, TrendingDown, Award, Fish, Trophy, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

interface XPTransaction {
  id: string
  amount: number
  reason: string
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

export default function XPHistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'gains' | 'losses'>('all')

  const { data: transactions, isLoading, error: queryError } = useQuery({
    queryKey: ['xp-transactions', user?.id, filter],
    queryFn: async () => {
      if (!user) return []

      let query = supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filter === 'gains') {
        query = query.gt('amount', 0)
      } else if (filter === 'losses') {
        query = query.lt('amount', 0)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching XP transactions:', error)
        return []
      }
      return data as XPTransaction[]
    },
    enabled: !!user,
    retry: false,
  })

  const getReasonIcon = (reason: string) => {
    if (reason.includes('catch')) return <Fish size={16} />
    if (reason.includes('challenge')) return <Trophy size={16} />
    if (reason.includes('session')) return <Calendar size={16} />
    return <Award size={16} />
  }

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      catch_logged: 'Catch Logged',
      challenge_completed: 'Challenge Completed',
      challenge_revoked: 'Challenge Revoked',
      session_completed: 'Session Completed',
      photo_added: 'Photo Added',
    }
    return labels[reason] || reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const totalGains = transactions?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0
  const totalLosses = Math.abs(transactions?.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0) || 0)

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">XP History</h1>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/40 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                <TrendingUp size={16} />
                <span className="text-xs font-medium">Total Gains</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                +{totalGains.toLocaleString()}
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/40 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                <TrendingDown size={16} />
                <span className="text-xs font-medium">Total Losses</span>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                -{totalLosses.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('gains')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                filter === 'gains'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Gains
            </button>
            <button
              onClick={() => setFilter('losses')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                filter === 'losses'
                  ? 'bg-red-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Losses
            </button>
          </div>

          {/* Transaction List */}
          {queryError ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">Unable to load XP history</p>
              <p className="text-xs text-muted-foreground">The XP transactions table may not be set up yet</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      transaction.amount > 0
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {getReasonIcon(transaction.reason)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {getReasonLabel(transaction.reason)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transaction.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${
                    transaction.amount > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
