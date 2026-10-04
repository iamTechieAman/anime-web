/**
 * loading.tsx — shown by Next.js while anime WatchPage/WatchClient is loading.
 */
export default function AnimeWatchLoading() {
  return (
    <div className="min-h-dvh bg-[#0b0c10] pt-20 px-4 max-w-[1800px] mx-auto">
      {/* Player skeleton */}
      <div className="w-full aspect-video bg-[#12131a] rounded-2xl animate-pulse mb-4 border border-white/[0.05]" />
      {/* Server pills skeleton */}
      <div className="flex gap-2 mb-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-8 w-24 bg-[#12131a] rounded-xl animate-pulse border border-white/[0.05]" />
        ))}
      </div>
      {/* Episode grid skeleton */}
      <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
        {Array.from({length: 20}).map((_, i) => (
          <div key={i} className="h-10 bg-[#12131a] rounded-xl animate-pulse border border-white/[0.05]" />
        ))}
      </div>
    </div>
  );
}
