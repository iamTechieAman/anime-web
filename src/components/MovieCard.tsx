"use client";

import { useState, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { Play, Star, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import React from "react";

// Shared movie item type
export interface MovieItem {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    backdrop_path?: string | null;
    vote_average: number;
    release_date?: string;
    first_air_date?: string;
    media_type?: string;
    overview?: string;
    rank?: number;
    liveViewers?: number;
    isMostViewed?: boolean;
}

const IMG_BASE = "https://image.tmdb.org/t/p";

// === MOVIE CARD (Pure CSS animations, no framer-motion on scroll) ===
export const MovieCard = memo(function MovieCard({ item, type = "movie" }: { item: MovieItem; type?: string }) {
    const [imgError, setImgError] = useState(false);
    const [liveViewers, setLiveViewers] = useState(item.liveViewers);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for visibility (replaces framer-motion whileInView)
    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
            { rootMargin: "-50px", threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!item.liveViewers) return;
        const interval = setInterval(() => {
            setLiveViewers((prev) => {
                if (!prev) return prev;
                const change = Math.floor(Math.random() * 201) - 100;
                return Math.max(100, prev + change);
            });
        }, 10000);
        return () => clearInterval(interval);
    }, [item.liveViewers]);

    const title = item.title || item.name || "Untitled";
    const releaseDate = item.release_date || item.first_air_date;
    const isUpcoming = releaseDate ? new Date(releaseDate) > new Date() : false;
    const year = (releaseDate || "").slice(0, 4);
    const rating = item.vote_average?.toFixed(1);
    const mediaType = item.media_type || type;
    const matchPercent = Math.round((item.vote_average || 0) * 10);

    return (
        <div
            ref={cardRef}
            className={`card-reveal ${isVisible ? 'card-visible' : ''}`}
        >
        <Link href={`/watch/${mediaType}/${item.id}`} className="block group">
            <div className="relative rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-white/10 hover:border-purple-500/50 transition-all duration-500 hover:shadow-[0_12px_30px_-10px_rgba(168,85,247,0.35)] premium-card">
                {/* Poster */}
                <div className="relative aspect-[2/3] overflow-hidden">
                    {item.poster_path && !imgError ? (
                        <img
                            src={`${IMG_BASE}/w342${item.poster_path}`}
                            srcSet={`${IMG_BASE}/w185${item.poster_path} 185w, ${IMG_BASE}/w342${item.poster_path} 342w`}
                            sizes="(max-width: 640px) 28vw, 180px"
                            alt={`${title} (${year}) - Stream HD on ToonPlayer`}
                            width={180}
                            height={270}
                            className="w-full h-full object-cover aspect-[2/3] transition-transform duration-500 group-hover:scale-105"
                            onError={() => setImgError(true)}
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                            <span className="text-zinc-600 text-3xl font-bold">{title.charAt(0)}</span>
                        </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Ranking Number */}
                    {item.rank && (
                        <div className="absolute bottom-0 -left-1 z-10 pointer-events-none drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                            <span className="text-[90px] font-black leading-none tracking-tighter" style={{ WebkitTextStroke: "2px white", color: "transparent" }}>
                                {item.rank}
                            </span>
                        </div>
                    )}

                    {/* Most Viewed badge */}
                    {item.isMostViewed && (
                        <div className="absolute top-0 left-0 flex items-center gap-1 bg-red-600/90 rounded-br-lg px-1.5 py-0.5 sm:px-2 sm:py-1 z-20 shadow-lg">
                            <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white fill-white" />
                            <span className="text-[7px] sm:text-[9px] font-bold text-white uppercase tracking-wider">
                                Most Viewed
                            </span>
                        </div>
                    )}

                    {/* Live Viewers badge */}
                    {liveViewers && (
                        <div className="absolute bottom-2 right-2 hidden sm:flex items-center gap-1.5 bg-black/80 rounded-full px-2 py-1 z-20 border border-white/10 shadow-lg group-hover:opacity-0 transition-opacity duration-300">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[9px] sm:text-[10px] font-bold text-white tracking-wide">
                                {liveViewers.toLocaleString()} watching
                            </span>
                        </div>
                    )}

                    {/* Rating badge */}
                    <div className={`absolute left-2 flex items-center gap-1 bg-black/70 rounded-md px-2 py-0.5 z-10 ${item.isMostViewed ? 'top-8' : 'top-2'}`}>
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-[11px] font-bold text-white">{rating}</span>
                    </div>

                    {/* Upcoming or HD badge */}
                    {isUpcoming ? (
                        <div className="absolute top-2 right-2 bg-purple-600/90 rounded px-1.5 py-0.5 z-20 shadow-lg border border-purple-500/30">
                            <span className="text-[9px] font-black text-white uppercase tracking-wider">
                                Upcoming
                            </span>
                        </div>
                    ) : (
                        <div className="absolute top-2 right-2 hidden sm:block bg-blue-500/80 rounded px-1.5 py-0.5 z-10">
                            <span className="text-[9px] font-bold text-white tracking-wider">HD</span>
                        </div>
                    )}

                    {/* Play button on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="w-14 h-14 rounded-full bg-purple-600/90 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.6)] border border-white/20">
                            <Play className="w-6 h-6 text-white fill-white ml-1" />
                        </div>
                    </div>

                    {/* Bottom info on hover */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-main)]">
                            {matchPercent > 0 && (
                                <span className={`font-bold ${matchPercent >= 70 ? "text-green-400" : matchPercent >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                                    {matchPercent}% Match
                                </span>
                            )}
                            {year && <span>• {year}</span>}
                            <span className="ml-auto uppercase text-[var(--text-muted)] text-[9px] font-medium">{mediaType}</span>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div className="p-3 bg-gradient-to-b from-transparent to-black/20">
                    <h3 className="text-[13px] font-bold text-[var(--text-main)] line-clamp-2 h-10 group-hover:text-purple-400 transition-colors duration-300 leading-tight">{title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)] font-medium">
                        {year && <span className="text-white/60">{year}</span>}
                        {year && <span className="w-1 h-1 rounded-full bg-white/20" />}
                        <span className="capitalize px-1.5 py-0.5 rounded bg-white/5">{mediaType}</span>
                    </div>
                </div>
            </div>
        </Link>
        </div>
    );
});

// === MOVIE GRID ===
export const MovieGrid = memo(function MovieGrid({ items, type = "movie" }: { items: MovieItem[]; type?: string }) {
    const validItems = items.filter(item => item && (item.poster_path || item.backdrop_path));
    return (
        <div className="responsive-grid">
            {validItems.map((item, idx) => (
                <MovieCard key={`${item.id}-${idx}`} item={item} type={item.media_type || type} />
            ))}
        </div>
    );
});

// === MOVIE ROW (Horizontal Scroll) ===
export const MovieRow = memo(function MovieRow({ items, type = "movie", title }: { items: MovieItem[]; type?: string; title?: string }) {
    const backupId = React.useId();
    const scrollId = `row-${title?.replace(/\s/g, "-") || backupId}`;

    const scroll = (direction: "left" | "right") => {
        const container = document.getElementById(scrollId);
        if (container) {
            const scrollAmount = container.clientWidth * 0.8;
            container.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
        }
    };

    return (
        <div className="relative group/row">
            {/* Scroll arrows */}
            <button
                onClick={() => scroll("left")}
                className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-[var(--bg-main)] to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
            >
                <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
                onClick={() => scroll("right")}
                className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-[var(--bg-main)] to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
            >
                <ChevronRight className="w-6 h-6 text-white" />
            </button>

            <div
                id={scrollId}
                className="flex overflow-x-auto gap-3 pb-4 hide-scrollbar scroll-smooth-x"
            >
                {items.filter(item => item && (item.poster_path || item.backdrop_path)).map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="flex-shrink-0 w-[28vw] sm:w-[155px] md:w-[170px] lg:w-[180px] max-w-[180px]">
                        <MovieCard item={item} type={item.media_type || type} />
                    </div>
                ))}
            </div>
        </div>
    );
});
