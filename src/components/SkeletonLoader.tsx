"use client";

import { memo } from "react";

// --- Hero Skeleton ---
export const HeroSkeleton = memo(function HeroSkeleton() {
    return (
        <div className="skeleton-hero relative">
            <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-transparent to-transparent z-10" />
            <div className="absolute bottom-12 left-6 md:left-12 z-20 space-y-4 w-full max-w-lg">
                {/* Badge */}
                <div className="w-32 h-6 skeleton-shine rounded" />
                {/* Title */}
                <div className="w-[80%] h-10 skeleton-shine rounded" />
                <div className="w-[50%] h-10 skeleton-shine rounded" />
                {/* Description */}
                <div className="space-y-2 mt-4">
                    <div className="w-[90%] h-3 skeleton-shine rounded" />
                    <div className="w-[70%] h-3 skeleton-shine rounded" />
                </div>
                {/* Buttons */}
                <div className="flex gap-3 mt-6">
                    <div className="w-36 h-12 skeleton-shine rounded" />
                    <div className="w-28 h-12 skeleton-shine rounded" />
                </div>
            </div>
        </div>
    );
});

// --- Card Skeleton ---
export const CardSkeleton = memo(function CardSkeleton() {
    return (
        <div className="w-full">
            <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden shimmer-card bg-zinc-900 border border-white/5" />
            <div className="mt-2 px-0.5 space-y-1.5">
                <div className="h-3.5 rounded w-4/5 shimmer-card bg-zinc-900" />
                <div className="h-2.5 rounded w-1/2 shimmer-card bg-zinc-900" />
            </div>
        </div>
    );
});

// --- Row Skeleton (Horizontal scroll row of cards) ---
export const RowSkeleton = memo(function RowSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {/* Section header skeleton */}
            <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-accent rounded-full" />
                <div className="w-5 h-5 shimmer-card bg-zinc-900 rounded" />
                <div className="w-40 h-5 shimmer-card bg-zinc-900 rounded" />
            </div>
            {/* Cards row */}
            <div className="netflix-row overflow-hidden">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[200px] lg:w-[220px]">
                        <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden shimmer-card bg-zinc-900 border border-white/5 mb-2" />
                        <div className="mt-2 px-0.5 space-y-1.5">
                            <div className="h-3.5 rounded w-4/5 shimmer-card bg-zinc-900" />
                            <div className="h-2.5 rounded w-1/2 shimmer-card bg-zinc-900" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

// --- Grid Skeleton ---
export const GridSkeleton = memo(function GridSkeleton({ count = 12 }: { count?: number }) {
    return (
        <div className="responsive-grid">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="w-full">
                    <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden shimmer-card bg-zinc-900 border border-white/5 mb-2" />
                    <div className="mt-2 px-0.5 space-y-1.5">
                        <div className="h-3.5 rounded w-4/5 shimmer-card bg-zinc-900" />
                        <div className="h-2.5 rounded w-1/2 shimmer-card bg-zinc-900" />
                    </div>
                </div>
            ))}
        </div>
    );
});

// --- Details Skeleton (for watch pages) ---
export const DetailsSkeleton = memo(function DetailsSkeleton() {
    return (
        <div className="min-h-dvh bg-[#0B0C10] text-white pt-16 pb-12 px-4 sm:px-6 md:px-8">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Title Skeleton */}
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-7 w-64 sm:w-96 bg-zinc-800/60 animate-pulse rounded-lg" />
                        <div className="h-4 w-36 bg-zinc-800/40 animate-pulse rounded-md" />
                    </div>
                    <div className="h-8 w-24 bg-zinc-800/40 animate-pulse rounded-full hidden sm:block" />
                </div>

                {/* Player & Sidebar Grid Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-[74%_minmax(0,26%)] gap-6 items-start">
                    {/* Player Column */}
                    <div className="space-y-4 w-full">
                        <div className="aspect-video w-full max-w-[1600px] mx-auto rounded-xl overflow-hidden bg-zinc-900/90 animate-pulse border border-white/5 shadow-2xl flex flex-col items-center justify-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <div className="w-0 h-0 border-y-[8px] border-y-transparent border-l-[14px] border-l-white/20 ml-1" />
                            </div>
                            <div className="h-3.5 w-36 rounded-full bg-zinc-800/70 animate-pulse" />
                        </div>

                        {/* Server Pills Bar Skeleton */}
                        <div className="h-14 w-full rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none">
                            <div className="h-8 w-24 bg-zinc-800/60 animate-pulse rounded-full shrink-0" />
                            <div className="h-8 w-28 bg-zinc-800/60 animate-pulse rounded-full shrink-0" />
                            <div className="h-8 w-24 bg-zinc-800/60 animate-pulse rounded-full shrink-0" />
                            <div className="h-8 w-32 bg-zinc-800/60 animate-pulse rounded-full shrink-0" />
                        </div>
                    </div>

                    {/* Episodes Sidebar Skeleton (Desktop) */}
                    <div className="hidden lg:flex flex-col w-full h-[600px] rounded-xl bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="h-6 w-28 bg-zinc-800/60 animate-pulse rounded-md" />
                            <div className="h-6 w-16 bg-zinc-800/40 animate-pulse rounded-md" />
                        </div>
                        <EpisodeListSkeleton mode="list" count={6} />
                    </div>
                </div>

                {/* Metadata Details Skeleton */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-6">
                    <div className="flex gap-6">
                        <div className="w-[140px] sm:w-[180px] aspect-[2/3] bg-zinc-800/60 animate-pulse rounded-xl shrink-0 hidden sm:block" />
                        <div className="flex-1 space-y-4">
                            <div className="h-8 bg-zinc-800/60 animate-pulse rounded-lg w-3/4" />
                            <div className="h-4 bg-zinc-800/40 animate-pulse rounded-md w-1/3" />
                            <div className="space-y-2 pt-2">
                                <div className="h-3 bg-zinc-800/40 animate-pulse rounded w-full" />
                                <div className="h-3 bg-zinc-800/40 animate-pulse rounded w-5/6" />
                                <div className="h-3 bg-zinc-800/40 animate-pulse rounded w-2/3" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- Continue Watching Skeleton ---
export const ContinueWatchingSkeleton = memo(function ContinueWatchingSkeleton() {
    return (
        <section className="mb-8 w-full overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-accent rounded-full shadow-[0_0_10px_var(--accent-glow)]" />
                <div className="w-4 h-4 skeleton-shine rounded" />
                <div className="w-40 h-5 skeleton-shine rounded" />
            </div>
            <div className="flex items-center gap-4 overflow-hidden pb-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="shrink-0 rounded-2xl bg-zinc-900 border border-white/5 skeleton-shine h-[120px] md:h-[140px] lg:h-[160px] w-[220px] md:w-[250px] lg:w-[280px]" />
                ))}
            </div>
        </section>
    );
});

// --- Trending Stars Skeleton ---
export const TrendingStarsSkeleton = memo(function TrendingStarsSkeleton() {
    return (
        <div className="bg-bg-card/50 p-6 rounded-2xl border border-border-color">
            <div className="h-5 w-36 skeleton-shine rounded mb-6" />
            <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-full skeleton-shine" />
                        <div className="w-16 h-2 skeleton-shine rounded" />
                        <div className="w-12 h-2 skeleton-shine rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
});

// --- Episode List & Grid Shimmer Skeleton (Zero layout shift) ---
export const EpisodeListSkeleton = memo(function EpisodeListSkeleton({
    mode = "list",
    count = 12,
}: {
    mode?: "list" | "grid";
    count?: number;
}) {
    if (mode === "grid") {
        return (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-1">
                {Array.from({ length: count }).map((_, i) => (
                    <div
                        key={i}
                        className="h-10 rounded-xl shimmer-card bg-zinc-900 border border-white/5"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2.5">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.04] bg-[#12131A]/60"
                >
                    <div className="w-24 h-14 rounded-lg shimmer-card bg-zinc-900 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 rounded w-3/4 shimmer-card bg-zinc-900" />
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 rounded w-16 shimmer-card bg-zinc-900" />
                            <div className="h-2.5 rounded w-12 shimmer-card bg-zinc-900" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

// --- Player Container Skeleton (Zero layout shift) ---
export const PlayerContainerSkeleton = memo(function PlayerContainerSkeleton() {
    return (
        <div className="aspect-video w-full max-w-[1600px] mx-auto rounded-xl overflow-hidden bg-black border border-white/5 shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 animate-pulse" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                    <div className="w-0 h-0 border-y-[8px] border-y-transparent border-l-[14px] border-l-white/20 ml-1 animate-pulse" />
                </div>
                <div className="h-3 w-36 rounded-full bg-zinc-800/80 animate-pulse" />
            </div>
        </div>
    );
});

