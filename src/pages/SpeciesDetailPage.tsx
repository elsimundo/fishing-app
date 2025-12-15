import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/layout/Layout'
import { SpeciesInfoCard } from '../components/fish/SpeciesInfoCard'

export default function SpeciesDetailPage() {
  const { speciesId } = useParams<{ speciesId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['species-info', speciesId],
    queryFn: async () => {
      if (!speciesId) return null

      const { data, error } = await supabase
        .from('species_info')
        .select('id, display_name')
        .eq('id', speciesId)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!speciesId,
    staleTime: 5 * 60 * 1000,
  })

  const speciesName = useMemo(() => data?.display_name || null, [data])

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        </div>

        <div className="px-4 pb-24 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Failed to load species.
            </div>
          ) : !speciesName ? (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Species not found.
            </div>
          ) : (
            <SpeciesInfoCard speciesName={speciesName} showLogButton />
          )}
        </div>
      </div>
    </Layout>
  )
}
