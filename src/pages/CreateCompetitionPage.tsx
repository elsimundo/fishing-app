import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { useCreateCompetition, useCompetition } from '../hooks/useCompetitions'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CompetitionType } from '../types'
import { CompetitionTypeStep } from '../components/compete/create/CompetitionTypeStep'
import { BasicInfoStep } from '../components/compete/create/BasicInfoStep'
import { RulesStep } from '../components/compete/create/RulesStep'
import { PrivacyStep } from '../components/compete/create/PrivacyStep'
import { ArrowLeft, Trophy } from 'lucide-react'

interface CompetitionLocationRestrictionForm {
  lat: number
  lng: number
  radius_km: number
}

interface FormData {
  // Step 1
  type: CompetitionType | null
  // Step 2
  title: string
  description: string
  starts_at: string
  ends_at: string
  prize: string
  cover_image_url: string
  // Step 3
  allowed_species: string[]
  water_type: 'saltwater' | 'freshwater' | 'any'
  location_restriction: CompetitionLocationRestrictionForm | null
  entry_fee: number
  max_participants: number | null
  // Step 4
  is_public: boolean
  invite_only: boolean
}

export default function CreateCompetitionPage() {
  const navigate = useNavigate()
  const { competitionId } = useParams<{ competitionId: string }>()
  const queryClient = useQueryClient()
  
  const isEditMode = Boolean(competitionId)
  const { data: existingCompetition, isLoading: loadingCompetition } = useCompetition(competitionId || '')
  const createCompetition = useCreateCompetition()

  const [step, setStep] = useState(1)
  const totalSteps = 4

  const [formData, setFormData] = useState<FormData>({
    type: null,
    title: '',
    description: '',
    starts_at: '',
    ends_at: '',
    prize: '',
    cover_image_url: '',
    allowed_species: [],
    water_type: 'any',
    location_restriction: null,
    entry_fee: 0,
    max_participants: null,
    is_public: true,
    invite_only: false,
  })

  // Load existing competition data in edit mode
  useEffect(() => {
    if (isEditMode && existingCompetition) {
      setFormData({
        type: existingCompetition.type,
        title: existingCompetition.title,
        description: existingCompetition.description || '',
        starts_at: new Date(existingCompetition.starts_at).toISOString().slice(0, 16),
        ends_at: new Date(existingCompetition.ends_at).toISOString().slice(0, 16),
        prize: existingCompetition.prize || '',
        cover_image_url: existingCompetition.cover_image_url || '',
        allowed_species: existingCompetition.allowed_species || [],
        water_type: existingCompetition.water_type || 'any',
        location_restriction: existingCompetition.location_restriction,
        entry_fee: existingCompetition.entry_fee || 0,
        max_participants: existingCompetition.max_participants,
        is_public: existingCompetition.is_public ?? true,
        invite_only: existingCompetition.invite_only ?? false,
      })
    }
  }, [isEditMode, existingCompetition])

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.type !== null
      case 2:
        return (
          formData.title.trim() !== '' &&
          formData.starts_at !== '' &&
          formData.ends_at !== '' &&
          new Date(formData.ends_at) > new Date(formData.starts_at)
        )
      case 3:
      case 4:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (step < totalSteps && canProceed()) {
      setStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1)
    } else {
      navigate('/compete')
    }
  }

  const updateCompetition = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('competitions')
        .update(data)
        .eq('id', competitionId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] })
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
      navigate(`/compete/${competitionId}`)
    },
  })

  const handleSubmit = async () => {
    if (!canProceed() || !formData.type) return

    try {
      const now = new Date()
      const startsAt = new Date(formData.starts_at)
      const status: 'upcoming' | 'active' = startsAt <= now ? 'active' : 'upcoming'

      const competitionData = {
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        starts_at: new Date(formData.starts_at).toISOString(),
        ends_at: new Date(formData.ends_at).toISOString(),
        prize: formData.prize.trim() || null,
        cover_image_url: formData.cover_image_url || null,
        allowed_species:
          formData.allowed_species.length > 0 ? formData.allowed_species : null,
        water_type: formData.water_type,
        location_restriction: formData.location_restriction,
        entry_fee: formData.entry_fee,
        max_participants: formData.max_participants,
        is_public: formData.is_public,
        invite_only: formData.invite_only,
        status,
      }

      if (isEditMode) {
        await updateCompetition.mutateAsync(competitionData)
      } else {
        const created = await createCompetition.mutateAsync(competitionData)
        navigate(`/compete/${created.id}`)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} competition`, error)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <CompetitionTypeStep
            selected={formData.type}
            onSelect={(type: CompetitionType) => updateFormData({ type })}
          />
        )
      case 2:
        return (
          <BasicInfoStep
            data={{
              title: formData.title,
              description: formData.description,
              starts_at: formData.starts_at,
              ends_at: formData.ends_at,
              prize: formData.prize,
            }}
            onChange={updateFormData}
          />
        )
      case 3:
        return (
          <RulesStep
            data={{
              allowed_species: formData.allowed_species,
              water_type: formData.water_type,
              location_restriction: formData.location_restriction,
              entry_fee: formData.entry_fee,
              max_participants: formData.max_participants,
            }}
            onChange={updateFormData}
          />
        )
      case 4:
        return (
          <PrivacyStep
            data={{
              is_public: formData.is_public,
              invite_only: formData.invite_only,
            }}
            onChange={updateFormData}
          />
        )
      default:
        return null
    }
  }

  const progress = Math.round((step / totalSteps) * 100)

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-32">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-bold text-gray-900">
              {isEditMode ? 'Edit Competition' : 'Create Competition'}
            </h1>
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-4 py-4">
          {/* Hero - only on step 1 */}
          {step === 1 && (
            <div className="mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <Trophy size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {isEditMode ? 'Edit Your Competition' : 'Create a Competition'}
                  </h2>
                  <p className="text-sm text-white/80">Challenge anglers to compete</p>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex justify-between text-xs">
              <span className="font-medium text-gray-700">
                Step {step} of {totalSteps}
              </span>
              <span className="font-semibold text-navy-800">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-navy-800 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            {renderStep()}
          </div>
        </div>

        {/* Fixed Bottom Actions */}
        <div className="fixed bottom-20 left-0 right-0 border-t border-gray-200 bg-white p-4 md:bottom-0">
          <div className="mx-auto flex max-w-2xl gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border-2 border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 rounded-xl bg-navy-800 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:bg-navy-400"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || createCompetition.isPending || updateCompetition.isPending}
                className="flex-1 rounded-xl bg-navy-800 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:bg-navy-400"
              >
                {createCompetition.isPending || updateCompetition.isPending
                  ? isEditMode ? 'Updating…' : 'Creating…'
                  : isEditMode ? 'Update Competition' : 'Create Competition'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
