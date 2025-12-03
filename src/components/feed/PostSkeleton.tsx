export function PostSkeleton() {
  return (
    <article className="animate-pulse bg-white px-5 py-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200" />
        </div>
      </div>

      {/* Image area */}
      <div className="mb-3 h-56 w-full rounded-xl bg-gray-200 md:h-72" />

      {/* Caption / stats */}
      <div className="space-y-2">
        <div className="h-3 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
      </div>
    </article>
  )
}
