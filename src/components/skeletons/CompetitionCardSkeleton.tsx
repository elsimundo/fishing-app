export function CompetitionCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-[#243B4A] border border-[#334155] animate-pulse">
      <div className="h-40 bg-[#334155]" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded-full bg-[#334155]" />
        <div className="h-3 w-full rounded-full bg-[#334155]" />
        <div className="h-3 w-2/3 rounded-full bg-[#1A2D3D]" />
      </div>
    </div>
  )
}
