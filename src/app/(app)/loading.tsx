/**
 * Route-level loading UI. Dynamic pages need a server round-trip; this shows
 * the page shape immediately so navigation never feels frozen.
 */
export default function AppLoading() {
  return (
    <div
      className="animate-fade min-w-0"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading…</span>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5 sm:mb-8 sm:pb-6">
        <div className="w-full max-w-xs space-y-2.5">
          <div className="skeleton h-2.5 w-24" />
          <div className="skeleton h-7 w-52 max-w-full" />
          <div className="skeleton h-3 w-36" />
        </div>
        <div className="skeleton h-9 w-28" />
      </div>

      <div>
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-line px-1 py-3.5"
          >
            <div className="skeleton size-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-3 w-1/3 min-w-24" />
              <div className="skeleton h-2.5 w-1/2 min-w-32" />
            </div>
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton hidden h-3 w-20 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
