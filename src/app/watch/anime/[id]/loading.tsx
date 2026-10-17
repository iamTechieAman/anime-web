import { DetailsSkeleton } from "@/components/SkeletonLoader";

/**
 * loading.tsx — shown by Next.js Suspense while Anime WatchClient is loading.
 * Prevents the blank screen flash and provides exact zero-layout-shift player skeleton.
 */
export default function AnimeWatchLoading() {
  return <DetailsSkeleton />;
}
