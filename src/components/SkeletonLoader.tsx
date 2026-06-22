"use client";

import { memo } from "react";

// --- Hero Skeleton ---
export const HeroSkeleton = memo(function HeroSkeleton() {
    return (
        <div className="skeleton-hero relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-transparent to-transparent z-10" />
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
        <div className="skeleton-card">
            <div className="skeleton-poster" />
            <div className="skeleton-text">
                <div />
                <div />
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
                <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
                <div className="w-5 h-5 skeleton-shine rounded" />
                <div className="w-40 h-5 skeleton-shine rounded" />
            </div>
            {/* Cards row */}
            <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[200px] lg:w-[220px]">
                        <div className="relative w-full aspect-[2/3] rounded-xl bg-white/5 overflow-hidden skeleton-shine mb-2" />
                        <div className="space-y-2 px-0.5">
                            <div className="h-3.5 skeleton-shine rounded w-4/5" />
                            <div className="h-2.5 skeleton-shine rounded w-1/2" />
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
                    <div className="relative w-full aspect-[2/3] rounded-xl bg-white/5 overflow-hidden skeleton-shine mb-2" />
                    <div className="space-y-2 px-0.5">
                        <div className="h-3.5 skeleton-shine rounded w-4/5" />
                        <div className="h-2.5 skeleton-shine rounded w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
});

// --- Details Skeleton (for watch pages) ---
export const DetailsSkeleton = memo(function DetailsSkeleton() {
    return (
        <div className="min-h-dvh bg-[var(--bg-main)] text-[var(--text-main)]">
            {/* Player skeleton */}
            <div className="pt-14">
                <div className="max-w-7xl mx-auto">
                    <div className="w-full aspect-video skeleton-shine rounded-b-xl" />
                </div>
            </div>
            {/* Info skeleton */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
                <div className="flex gap-6">
                    <div className="w-[120px] aspect-[2/3] skeleton-shine rounded-xl shrink-0 hidden md:block" />
                    <div className="flex-1 space-y-4">
                        <div className="h-8 skeleton-shine rounded w-2/3" />
                        <div className="h-4 skeleton-shine rounded w-1/3" />
                        <div className="space-y-2">
                            <div className="h-3 skeleton-shine rounded w-full" />
                            <div className="h-3 skeleton-shine rounded w-[90%]" />
                            <div className="h-3 skeleton-shine rounded w-[75%]" />
                        </div>
                        <div className="flex gap-3 mt-4">
                            <div className="h-10 w-28 skeleton-shine rounded-lg" />
                            <div className="h-10 w-28 skeleton-shine rounded-lg" />
                            <div className="h-10 w-28 skeleton-shine rounded-lg" />
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
        <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 skeleton-shine rounded" />
                <div className="w-40 h-5 skeleton-shine rounded" />
            </div>
            <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex-none w-[200px] md:w-[280px] aspect-video rounded-xl skeleton-shine" />
                ))}
            </div>
        </section>
    );
});

// --- Trending Stars Skeleton ---
export const TrendingStarsSkeleton = memo(function TrendingStarsSkeleton() {
    return (
        <div className="bg-[var(--bg-card)]/50 p-6 rounded-2xl border border-[var(--border-color)]">
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
