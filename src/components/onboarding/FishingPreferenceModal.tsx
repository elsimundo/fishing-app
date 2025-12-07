import { useState } from 'react'
import { Loader2, Waves, TreePine, Fish } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'react-hot-toast'
import type { FishingPreference } from '../../types'

interface FishingPreferenceModalProps {
  onComplete: () => void
}

export function FishingPreferenceModal({ onComplete }: FishingPreferenceModalProps) {
  const { user } = useAuth()
  const [selected, setSelected] = useState<FishingPreference | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!selected || !user) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ fishing_preference: selected })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Preferences saved!')
      onComplete()
    } catch (error: any) {
      console.error('Failed to save preference:', error)
      toast.error('Failed to save preference')
    } finally {
      setIsSaving(false)
    }
  }

  const options: { value: FishingPreference; label: string; description: string; icon: typeof Fish }[] = [
    {
      value: 'sea',
      label: 'Sea Fishing',
      description: 'Saltwater, beach, boat, and offshore fishing',
      icon: Waves,
    },
    {
      value: 'freshwater',
      label: 'Freshwater Fishing',
      description: 'Rivers, lakes, ponds, and streams',
      icon: TreePine,
    },
    {
      value: 'both',
      label: 'Both',
      description: "I enjoy all types of fishing",
      icon: Fish,
    },
  ]

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/95 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Fish className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to Fishing App!</h1>
          <p className="mt-2 text-white/70">
            What type of fishing are you interested in?
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option) => {
            const Icon = option.icon
            const isSelected = selected === option.value
            return (
              <button
                key={option.value}
                onClick={() => setSelected(option.value)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-white bg-white text-navy-900'
                    : 'border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10'
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    isSelected ? 'bg-navy-800' : 'bg-white/10'
                  }`}
                >
                  <Icon className={`h-6 w-6 ${isSelected ? 'text-white' : 'text-white/80'}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{option.label}</p>
                  <p className={`text-sm ${isSelected ? 'text-navy-600' : 'text-white/60'}`}>
                    {option.description}
                  </p>
                </div>
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    isSelected ? 'border-navy-800 bg-navy-800' : 'border-white/40'
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Info */}
        <p className="mt-6 text-center text-sm text-white/50">
          This helps us show you relevant content. You can change this anytime in settings.
        </p>

        {/* Continue Button */}
        <button
          onClick={handleSave}
          disabled={!selected || isSaving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 font-semibold text-navy-900 transition-colors hover:bg-white/90 disabled:bg-white/30 disabled:text-white/50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  )
}
