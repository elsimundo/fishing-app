interface PrivacyStepProps {
  data: {
    is_public: boolean
    invite_only: boolean
  }
  onChange: (updates: Partial<PrivacyStepProps['data']>) => void
}

const OPTIONS = [
  {
    id: 'public',
    icon: '🌐',
    title: 'Public',
    description: 'Anyone can discover and join this competition.',
    values: { is_public: true, invite_only: false },
  },
  {
    id: 'private',
    icon: '🔒',
    title: 'Private (invite only)',
    description: 'Only people you invite can join.',
    values: { is_public: false, invite_only: true },
  },
  {
    id: 'friends',
    icon: '👥',
    title: 'Friends only',
    description: 'Visible only to friends (implementation TBD).',
    values: { is_public: false, invite_only: false },
  },
] as const

export function PrivacyStep({ data, onChange }: PrivacyStepProps) {
  const selectedId = data.is_public && !data.invite_only ? 'public' : data.invite_only ? 'private' : 'friends'

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-foreground">Who can join?</h2>
      <p className="mb-6 text-sm text-muted-foreground">Choose how visible your competition should be.</p>

      <div className="space-y-3">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.values)}
            className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
              selectedId === option.id
                ? 'border-navy-800 bg-navy-50'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
              {option.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{option.title}</p>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
            <div
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                selectedId === option.id ? 'border-primary bg-primary' : 'border-muted-foreground'
              }`}
            >
              {selectedId === option.id && (
                <span className="text-[10px] font-bold text-white">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <span className="mr-1">💡</span>
        Public competitions are more discoverable and can attract more anglers.
      </div>
    </div>
  )
}
