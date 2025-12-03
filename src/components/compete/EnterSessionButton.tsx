import { useState } from 'react'
import { useCompetition } from '../../hooks/useCompetitions'
import { SessionPickerModal } from './SessionPickerModal'

interface EnterSessionButtonProps {
  competitionId: string
}

export function EnterSessionButton({ competitionId }: EnterSessionButtonProps) {
  const [open, setOpen] = useState(false)
  const { data: competition } = useCompetition(competitionId)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        Enter your session
      </button>

      {open && competition && (
        <SessionPickerModal competition={competition} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
