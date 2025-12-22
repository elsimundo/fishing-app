import { useEffect, useState } from 'react'

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
  const splitDateTime = (value: string): { date: string; time: string } => {
    if (!value) return { date: '', time: '' }
    const [date, time] = value.split('T')
    return { date: date ?? '', time: time ?? '' }
  }

  const joinDateTime = (date: string, time: string): string => {
    if (!date || !time) return ''
    return `${date}T${time}`
  }

  const starts = splitDateTime(data.starts_at)
  const ends = splitDateTime(data.ends_at)

  const [startsDate, setStartsDate] = useState(starts.date)
  const [startsTime, setStartsTime] = useState(starts.time)
  const [endsDate, setEndsDate] = useState(ends.date)
  const [endsTime, setEndsTime] = useState(ends.time)

  // Keep local UI state in sync when data changes (e.g. edit mode loads existing competition)
  useEffect(() => {
    setStartsDate(starts.date)
    setStartsTime(starts.time)
  }, [data.starts_at])

  useEffect(() => {
    setEndsDate(ends.date)
    setEndsTime(ends.time)
  }, [data.ends_at])

  const endMinTime = endsDate && startsDate && endsDate === startsDate ? startsTime : undefined

  const commitStarts = (nextDate: string, nextTime: string) => {
    onChange({ starts_at: joinDateTime(nextDate, nextTime) })
  }

  const commitEnds = (nextDate: string, nextTime: string) => {
    onChange({ ends_at: joinDateTime(nextDate, nextTime) })
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-foreground">Competition Details</h2>
      <p className="mb-6 text-sm text-muted-foreground">Tell anglers what this competition is about.</p>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">
            Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            maxLength={100}
            placeholder="e.g. Weekend Bass Challenge"
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{data.title.length}/100</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Description</label>
          <textarea
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            maxLength={500}
            rows={4}
            placeholder="What makes this competition special?"
            className="w-full resize-none rounded-xl border-2 border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{data.description.length}/500</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">
            Start date & time <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={startsDate}
              onChange={(e) => {
                const v = e.target.value
                setStartsDate(v)
                commitStarts(v, startsTime)
              }}
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <input
              type="time"
              value={startsTime}
              onChange={(e) => {
                const v = e.target.value
                setStartsTime(v)
                commitStarts(startsDate, v)
              }}
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">
            End date & time <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={endsDate}
              min={startsDate || undefined}
              onChange={(e) => {
                const v = e.target.value
                setEndsDate(v)
                commitEnds(v, endsTime)
              }}
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <input
              type="time"
              value={endsTime}
              min={endMinTime}
              onChange={(e) => {
                const v = e.target.value
                setEndsTime(v)
                commitEnds(endsDate, v)
              }}
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Prizes can be set per award category in the next step.
          </p>
        </div>
      </div>
    </div>
  )
}
