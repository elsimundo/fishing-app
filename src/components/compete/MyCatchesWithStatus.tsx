import { useMyCompetitionCatches } from '../../hooks/useCompetitionLeaderboard'
import { Clock, Check, X, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface MyCatchesWithStatusProps {
  competitionId: string
}

export function MyCatchesWithStatus({ competitionId }: MyCatchesWithStatusProps) {
  const { data: myCatches, isLoading } = useMyCompetitionCatches(competitionId)

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading your catches...</div>
  }

  if (!myCatches || myCatches.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground font-semibold">No catches yet</p>
        <p className="text-sm text-muted-foreground">Log your first catch to start competing!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-foreground mb-4">Your Catches ({myCatches.length})</h3>

      {myCatches.map((catch_: any) => {
        const statusConfig = {
          pending: {
            icon: Clock,
            color: 'yellow',
            label: 'Pending Validation',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-300',
            textColor: 'text-yellow-800',
          },
          approved: {
            icon: Check,
            color: 'green',
            label: 'Approved',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-300',
            textColor: 'text-green-800',
          },
          rejected: {
            icon: X,
            color: 'red',
            label: 'Rejected',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-300',
            textColor: 'text-red-800',
          },
        }

        const status =
          statusConfig[catch_.validation_status as keyof typeof statusConfig] ||
          statusConfig.approved
        const StatusIcon = status.icon

        return (
          <div
            key={catch_.id}
            className={`${status.bgColor} border-2 ${status.borderColor} rounded-xl p-4`}
          >
            <div className="flex items-start gap-3">
              {/* Photo */}
              {catch_.photo_url ? (
                <img
                  src={catch_.photo_url}
                  alt={catch_.species}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                  🐟
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-foreground">
                    {catch_.species} - {catch_.weight_kg}kg
                  </h4>
                  <div
                    className={`px-2 py-1 ${status.bgColor} ${status.textColor} rounded-full text-xs font-semibold flex items-center gap-1`}
                  >
                    <StatusIcon size={12} />
                    <span>{status.label}</span>
                  </div>
                </div>

                {catch_.length_cm && (
                  <p className="text-sm text-muted-foreground">{catch_.length_cm}cm</p>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(catch_.created_at), { addSuffix: true })}
                </p>

                {/* Rejection Reason */}
                {catch_.validation_status === 'rejected' && catch_.rejection_reason && (
                  <div className="mt-2 p-2 bg-red-100 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-800">
                        <span className="font-semibold">Reason:</span> {catch_.rejection_reason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
