import { DetailsSkeleton } from "@/components/SkeletonLoader";

/**
 * loading.tsx — shown by Next.js Suspense while WatchPage/WatchClient is loading.
 * Prevents the blank screen flash that users see before data arrives.
 */
export default function WatchLoading() {
  return <DetailsSkeleton />;
}
