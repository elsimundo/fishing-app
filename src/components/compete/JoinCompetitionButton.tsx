import { useState } from 'react'

interface JoinCompetitionButtonProps {
  competitionId: string
}

export function JoinCompetitionButton({ competitionId }: JoinCompetitionButtonProps) {
  const [joining, setJoining] = useState(false)

  const handleJoin = async () => {
    if (joining) return
    setJoining(true)
    // Week 2: simple simulated join with UI feedback only
    setTimeout(() => {
      setJoining(false)
      // In a future iteration this will be wired to real participation logic
      // For now we just rely on the Enter Session flow to create a real entry.
      // A toast system can be added later for nicer feedback.
      // eslint-disable-next-line no-alert
      alert('Joined competition! Now enter your best session when ready.')
    }, 800)
  }

  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={joining}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
    >
      {joining ? 'Joining…' : 'Join competition'}
    </button>
  )
}
