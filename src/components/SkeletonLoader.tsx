"use client";

import { memo } from "react";

// --- Hero Skeleton (Zero layout shift matching HeroCarousel dimensions) ---
export const HeroSkeleton = memo(function HeroSkeleton() {
    return (
        <div className="relative w-full h-[62vh] sm:h-[68vh] md:h-[76vh] min-h-[460px] sm:min-h-[520px] md:min-h-[580px] max-h-[820px] bg-bg-card overflow-hidden border-b border-white/5">
            {/* Ambient backdrop glow shimmer */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/60 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-bg-main/90 via-bg-main/40 to-transparent z-10" />
            <div className="absolute inset-0 shimmer-card opacity-40 pointer-events-none" />

            {/* Bottom Content Area */}
            <div className="absolute bottom-10 sm:bottom-14 left-4 sm:left-8 md:left-14 z-20 space-y-4 w-full max-w-xl pr-4">
                {/* Category & Rating Pill */}
                <div className="flex items-center gap-2.5">
                    <div className="w-20 h-6 shimmer-card rounded-lg" />
                    <div className="w-16 h-6 shimmer-card rounded-lg" />
                </div>

                {/* Title Placeholders */}
                <div className="space-y-2">
                    <div className="w-[85%] h-9 sm:h-12 shimmer-card rounded-xl" />
                    <div className="w-[50%] h-9 sm:h-12 shimmer-card rounded-xl" />
                </div>

                {/* Description Lines */}
                <div className="space-y-2 pt-1 max-w-lg">
                    <div className="w-full h-3.5 shimmer-card rounded" />
                    <div className="w-[88%] h-3.5 shimmer-card rounded" />
                    <div className="w-[65%] h-3.5 shimmer-card rounded" />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-3">
                    <div className="w-36 h-12 rounded-2xl shimmer-card" />
                    <div className="w-32 h-12 rounded-2xl shimmer-card" />
                </div>
            </div>
        </div>
    );
});

// --- Card Skeleton (Exact aspect-[2/3] and rounded-[18px] matching MovieCard) ---
export const CardSkeleton = memo(function CardSkeleton() {
    return (
        <div className="w-full">
            <div className="relative w-full aspect-[2/3] rounded-[18px] overflow-hidden shimmer-card bg-zinc-900 border border-white/5 shadow-md" />
            <div className="mt-2.5 px-0.5 space-y-1.5">
                <div className="h-3.5 rounded-md w-4/5 shimmer-card bg-zinc-900" />
                <div className="h-2.5 rounded-md w-1/2 shimmer-card bg-zinc-900" />
            </div>
        </div>
    );
});

// --- Row Skeleton (Horizontal scroll row of cards matching MovieRow) ---
export const RowSkeleton = memo(function RowSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="space-y-4 w-full">
            {/* Section Header Placeholder */}
            <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-accent rounded-full shadow-[0_0_10px_var(--accent-glow)]" />
                <div className="w-5 h-5 shimmer-card rounded-md" />
                <div className="w-44 h-5 shimmer-card rounded-md" />
            </div>
            {/* Cards Horizontal Snap Row */}
            <div className="netflix-row overflow-hidden">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[200px] lg:w-[220px]">
                        <div className="relative w-full aspect-[2/3] rounded-[18px] overflow-hidden shimmer-card bg-zinc-900 border border-white/5 mb-2.5 shadow-md" />
                        <div className="px-0.5 space-y-1.5">
                            <div className="h-3.5 rounded-md w-4/5 shimmer-card bg-zinc-900" />
                            <div className="h-2.5 rounded-md w-1/2 shimmer-card bg-zinc-900" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

// --- Grid Skeleton (Symmetrical multi-column responsive grid matching browse/genres) ---
export const GridSkeleton = memo(function GridSkeleton({ count = 14 }: { count?: number }) {
    return (
        <div className="responsive-grid">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="w-full">
                    <div className="relative w-full aspect-[2/3] rounded-[18px] overflow-hidden shimmer-card bg-zinc-900 border border-white/5 mb-2.5 shadow-md" />
                    <div className="px-0.5 space-y-1.5">
                        <div className="h-3.5 rounded-md w-4/5 shimmer-card bg-zinc-900" />
                        <div className="h-2.5 rounded-md w-1/2 shimmer-card bg-zinc-900" />
                    </div>
                </div>
            ))}
        </div>
    );
});

// --- Details Skeleton (For watch pages with zero layout shift) ---
export const DetailsSkeleton = memo(function DetailsSkeleton() {
    return (
        <div className="min-h-dvh bg-bg-main text-white/90 pt-16 pb-12 px-4 sm:px-6 md:px-8 font-sans tracking-tight">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Title Bar Skeleton */}
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-7 w-64 sm:w-96 shimmer-card rounded-full" />
                        <div className="h-4 w-36 shimmer-card rounded-full" />
                    </div>
                    <div className="h-8 w-24 shimmer-card rounded-full hidden sm:block" />
                </div>

                {/* Player & Episodes Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[74%_minmax(0,26%)] gap-6 items-start">
                    {/* Player Column */}
                    <div className="space-y-4 w-full">
                        <div className="aspect-video w-full max-w-[1600px] mx-auto rounded-2xl overflow-hidden bg-[#0c0d12] border border-white/10 ring-1 ring-white/5 shadow-2xl relative flex flex-col items-center justify-center gap-3">
                            <div className="absolute inset-0 shimmer-card opacity-30 pointer-events-none" />
                            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md relative z-10">
                                <div className="w-0 h-0 border-y-[8px] border-y-transparent border-l-[14px] border-l-white/60 ml-1" />
                            </div>
                            <div className="h-3.5 w-36 rounded-full shimmer-card relative z-10" />
                        </div>

                        {/* Server Pills Bar Skeleton */}
                        <div className="h-14 w-full rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl p-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none">
                            <div className="h-8 w-24 shimmer-card rounded-xl shrink-0" />
                            <div className="h-8 w-28 shimmer-card rounded-xl shrink-0" />
                            <div className="h-8 w-24 shimmer-card rounded-xl shrink-0" />
                            <div className="h-8 w-32 shimmer-card rounded-xl shrink-0" />
                        </div>
                    </div>

                    {/* Episodes Sidebar Skeleton (Desktop) */}
                    <div className="hidden lg:flex flex-col w-full h-[600px] rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between pb-1 border-b border-white/5">
                            <div className="h-6 w-28 shimmer-card rounded-full" />
                            <div className="h-6 w-16 shimmer-card rounded-full" />
                        </div>
                        <EpisodeListSkeleton mode="list" count={6} />
                    </div>
                </div>

                {/* Metadata Details Skeleton */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-6">
                    <div className="flex gap-6">
                        <div className="w-[140px] sm:w-[180px] aspect-[2/3] shimmer-card rounded-[18px] shrink-0 hidden sm:block" />
                        <div className="flex-1 space-y-4">
                            <div className="h-8 shimmer-card rounded-xl w-3/4" />
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-16 shimmer-card rounded-md" />
                                <div className="h-5 w-20 shimmer-card rounded-md" />
                                <div className="h-5 w-14 shimmer-card rounded-md" />
                            </div>
                            <div className="space-y-2.5 pt-2">
                                <div className="h-3.5 shimmer-card rounded w-full" />
                                <div className="h-3.5 shimmer-card rounded w-5/6" />
                                <div className="h-3.5 shimmer-card rounded w-2/3" />
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
                <div className="w-4 h-4 shimmer-card rounded" />
                <div className="w-40 h-5 shimmer-card rounded" />
            </div>
            <div className="flex items-center gap-4 overflow-hidden pb-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="shrink-0 rounded-2xl bg-zinc-900 border border-white/5 shimmer-card h-[120px] md:h-[140px] lg:h-[160px] w-[220px] md:w-[250px] lg:w-[280px]" />
                ))}
            </div>
        </section>
    );
});

// --- Trending Stars Skeleton ---
export const TrendingStarsSkeleton = memo(function TrendingStarsSkeleton() {
    return (
        <div className="bg-bg-card/50 p-6 rounded-2xl border border-border-color">
            <div className="h-5 w-36 shimmer-card rounded mb-6" />
            <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-full shimmer-card" />
                        <div className="w-16 h-2 shimmer-card rounded" />
                        <div className="w-12 h-2 shimmer-card rounded" />
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
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-1">
                {Array.from({ length: count }).map((_, i) => (
                    <div
                        key={i}
                        className="h-10 rounded-xl shimmer-card bg-white/5 border border-white/10"
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
                    className="flex items-center gap-3.5 p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl"
                >
                    <div className="w-24 h-14 rounded-xl shimmer-card shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 rounded-full w-3/4 shimmer-card" />
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 rounded-full w-16 shimmer-card" />
                            <div className="h-2.5 rounded-full w-12 shimmer-card" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

// --- Player Container Skeleton (Zero layout shift matching player dimensions) ---
export const PlayerContainerSkeleton = memo(function PlayerContainerSkeleton() {
    return (
        <div className="aspect-video w-full max-w-[1600px] mx-auto rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl relative">
            <div className="absolute inset-0 shimmer-card opacity-30 pointer-events-none" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                    <div className="w-0 h-0 border-y-[8px] border-y-transparent border-l-[14px] border-l-white/20 ml-1" />
                </div>
                <div className="h-3.5 w-36 rounded-full shimmer-card" />
            </div>
        </div>
    );
});
