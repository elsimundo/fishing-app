interface BasicInfoStepProps {
  data: {
    title: string
    description: string
    starts_at: string
    ends_at: string
  }
  onChange: (updates: Partial<BasicInfoStepProps['data']>) => void
}

export function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">Competition Details</h2>
      <p className="mb-6 text-sm text-gray-600">Tell anglers what this competition is about.</p>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">
            Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            maxLength={100}
            placeholder="e.g. Weekend Bass Challenge"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
          />
          <p className="mt-1 text-right text-xs text-gray-500">{data.title.length}/100</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">Description</label>
          <textarea
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            maxLength={500}
            rows={4}
            placeholder="What makes this competition special?"
            className="w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
          />
          <p className="mt-1 text-right text-xs text-gray-500">{data.description.length}/500</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">
            Start date & time <span className="text-red-600">*</span>
          </label>
          <input
            type="datetime-local"
            value={data.starts_at}
            onChange={(e) => onChange({ starts_at: e.target.value })}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">
            End date & time <span className="text-red-600">*</span>
          </label>
          <input
            type="datetime-local"
            value={data.ends_at}
            min={data.starts_at}
            onChange={(e) => onChange({ ends_at: e.target.value })}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Prizes can be set per award category in the next step.
          </p>
        </div>
      </div>
    </div>
  )
}
