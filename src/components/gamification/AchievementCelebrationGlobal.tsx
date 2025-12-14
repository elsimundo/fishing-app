import { useAchievementCelebration } from '../../hooks/useAchievementCelebration.tsx'
import { useProfile } from '../../hooks/useProfile'
import { AchievementUnlockedModal } from './AchievementUnlockedModal'
import { ShareableAchievementCard } from './ShareableAchievementCard'

/**
 * Global component that renders achievement celebration modals.
 * Place this once near the root of your app (inside the AchievementCelebrationProvider).
 */
export function AchievementCelebrationGlobal() {
  const { 
    current, 
    levelUp, 
    isOpen, 
    isShareOpen,
    closeAndShowNext, 
    openShare,
    closeShare 
  } = useAchievementCelebration()
  
  const { data: profile } = useProfile()
  const username = profile?.username || 'angler'


  if (!current) return null

  return (
    <>
      {/* Main celebration modal */}
      <AchievementUnlockedModal
        isOpen={isOpen && !isShareOpen}
        onClose={closeAndShowNext}
        achievement={current}
        levelUp={levelUp}
        onShare={openShare}
      />

      {/* Share card modal */}
      {isShareOpen && (
        <ShareableAchievementCard
          achievement={current}
          username={username}
          onClose={() => {
            closeShare()
            closeAndShowNext()
          }}
        />
      )}
    </>
  )
}
