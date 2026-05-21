"use client";

import { useState, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { Play, Star, ChevronLeft, ChevronRight, Flame, Info } from "lucide-react";
import React from "react";

// Shared movie item type
export interface MovieItem {
    id: number | string;
    title?: string;
    name?: string;
    poster_path: string | null;
    backdrop_path?: string | null;
    image?: string;
    vote_average?: number;
    release_date?: string;

    first_air_date?: string;
    media_type?: string;
    overview?: string;
    rank?: number;
    liveViewers?: number;
    isMostViewed?: boolean;
    availableEpisodes?: {
        sub?: number;
        dub?: number;
        raw?: number;
    };
}

const IMG_BASE = "https://image.tmdb.org/t/p";

// === MOVIE CARD (Pure CSS animations, no framer-motion on scroll) ===
export const MovieCard = memo(function MovieCard({ item, type = "movie", isFeatured = false }: { item: MovieItem; type?: string; isFeatured?: boolean }) {
    const [imgError, setImgError] = useState(false);
    const [liveViewers, setLiveViewers] = useState(item.liveViewers);
    const [isVisible, setIsVisible] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(true);
        }, 600); // 600ms delay before triggering "trailer"
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(false);
    };

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
            className={`card-reveal ${isVisible ? 'card-visible' : ''} ${isFeatured ? 'grid-featured' : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleMouseEnter}
            onTouchEnd={handleMouseLeave}
        >
        <Link href={`/watch/${mediaType}/${item.id}`} className="block group w-full h-full">
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-white/5 premium-card flex flex-col">
                {/* Poster / Simulated Trailer Box */}
                <div className="relative flex-1 min-h-0 aspect-[2/3] overflow-hidden">
                    {((item.poster_path || item.image) && !imgError) ? (
                        <img
                            src={item.poster_path ? `${IMG_BASE}/w342${item.poster_path}` : item.image}
                            srcSet={item.poster_path ? `${IMG_BASE}/w185${item.poster_path} 185w, ${IMG_BASE}/w342${item.poster_path} 342w` : undefined}
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


                    {/* Simulated Trailer Overlay (Backdrop Image) */}
                    {isHovered && item.backdrop_path && (
                        <div className="absolute inset-0 z-10 animate-fadeSlideDown bg-black">
                            <img
                                src={`${IMG_BASE}/w500${item.backdrop_path}`}
                                alt={`${title} Trailer`}
                                className="w-full h-full object-cover opacity-80"
                            />
                            {/* Trailer Progress Bar Simulation */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                <div className="h-full bg-red-600 w-1/3 animate-[pulse_2s_ease-in-out_infinite]" />
                            </div>
                            <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-widest border border-white/10">
                                Trailer Playing
                            </div>
                        </div>
                    )}

                    {/* Gradient & Glassmorphism overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500 z-[5]" />
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[5]" />

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
                        <div className="absolute top-2 right-2 bg-orange-500/90 rounded px-1.5 py-0.5 z-20 shadow-lg border border-orange-500/30">
                            <span className="text-[9px] font-black text-white uppercase tracking-wider">
                                Upcoming
                            </span>
                        </div>
                    ) : (
                        <div className="absolute top-2 right-2 hidden sm:block bg-blue-500/80 rounded px-1.5 py-0.5 z-10">
                            <span className="text-[9px] font-bold text-white tracking-wider">HD</span>
                        </div>
                    )}

                    {/* Quick action buttons on hover */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 translate-y-4 group-hover:translate-y-0">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.6)] border border-white/20 transform hover:scale-110 transition-transform cursor-pointer">
                            <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-white ml-1" />
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-colors" title="Add to Watchlist">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                            <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-colors" title="More Info">
                                <Info className="w-[18px] h-[18px]" />
                            </button>
                        </div>
                    </div>

                    {/* Bottom info on hover */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 z-20">
                        <div className="flex items-center gap-2 text-[10px] text-white font-bold">
                            {matchPercent > 0 && (
                                <span className={`font-bold ${matchPercent >= 70 ? "text-green-400" : matchPercent >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                                    {matchPercent}% Match
                                </span>
                            )}
                            {/* Anime Badges */}
                            {(item.availableEpisodes?.sub || item.availableEpisodes?.dub) && (
                                <div className="flex gap-1 items-center shrink-0 border border-white/20 rounded-sm bg-black/40 overflow-hidden">
                                    {(item.availableEpisodes?.sub ?? 0) > 0 && (
                                        <span className="px-1 md:px-1.5 py-0.5 font-medium border-r border-white/20 flex items-center gap-1 text-[#4ade80]">
                                            <span className="hidden sm:inline">CC</span> {item.availableEpisodes.sub}
                                        </span>
                                    )}
                                    {(item.availableEpisodes?.dub ?? 0) > 0 && (
                                        <span className="px-1 md:px-1.5 py-0.5 font-medium text-[#c084fc] flex items-center gap-1">
                                            <span className="hidden sm:inline">MIC</span> {item.availableEpisodes.dub}
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-2 ml-auto text-white/90">
                                <span className="flex items-center gap-1">
                                    <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current" />
                                    {rating ? rating : 'NR'}
                                </span>
                                {year && <span>• {year}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Title and Metadata */}
                <div className="p-3.5 bg-gradient-to-b from-[var(--bg-card)] to-black/40">
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-orange-400 transition-colors duration-300 tracking-tight">{title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                        {year && <span>{year}</span>}
                        {year && <span className="w-1 h-1 rounded-full bg-white/20" />}
                        <span className="capitalize">{mediaType === 'tv' ? 'Series' : 'Movie'}</span>
                        {(item.vote_average ?? 0) > 0 && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span className="flex items-center gap-0.5 text-yellow-400">
                                    <Star className="w-3 h-3 fill-yellow-400" />
                                    {rating}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Link>
        </div>
    );
});

// === MOVIE GRID ===
export const MovieGrid = memo(function MovieGrid({ items, type = "movie" }: { items: MovieItem[]; type?: string }) {
    const validItems = items.filter(item => item && (item.poster_path || item.backdrop_path || item.image));
    return (
        <div className="responsive-grid">
            {validItems.map((item, idx) => (
                <MovieCard key={`${item.id}-${idx}`} item={item} type={item.media_type || type} isFeatured={idx === 0} />
            ))}
        </div>
    );
});

// === MOVIE ROW (Horizontal Scroll) ===
export const MovieRow = memo(function MovieRow({ items, type = "movie", title, isLarge = false }: { items: MovieItem[]; type?: string; title?: string; isLarge?: boolean }) {
    const backupId = React.useId();
    const scrollId = `row-${String(title || backupId).replace(/\s/g, "-")}`;

    const scroll = (direction: "left" | "right") => {
        const container = document.getElementById(scrollId);
        if (container) {
            // Scroll by full container width minus a bit of padding to see the next card
            const scrollAmount = container.clientWidth - (container.clientWidth * 0.15);
            container.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
        }
    };

    return (
        <div className="relative group/row -mx-4 md:-mx-8 px-4 md:px-8">
            {/* Scroll arrows with wider gradient edges for cinematic feel */}
            <button
                onClick={() => scroll("left")}
                className="absolute left-0 top-0 bottom-0 z-20 w-12 md:w-20 bg-gradient-to-r from-[var(--bg-main)] via-[var(--bg-main)]/80 to-transparent flex items-center justify-start pl-2 md:pl-4 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
            >
                <ChevronLeft className="w-8 h-8 text-white drop-shadow-lg transform transition-transform hover:scale-125" />
            </button>
            <button
                onClick={() => scroll("right")}
                className="absolute right-0 top-0 bottom-0 z-20 w-12 md:w-20 bg-gradient-to-l from-[var(--bg-main)] via-[var(--bg-main)]/80 to-transparent flex items-center justify-end pr-2 md:pr-4 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
            >
                <ChevronRight className="w-8 h-8 text-white drop-shadow-lg transform transition-transform hover:scale-125" />
            </button>

            <div
                id={scrollId}
                className="flex overflow-x-auto gap-4 md:gap-5 pb-8 pt-2 hide-scrollbar scroll-smooth-x snap-x snap-mandatory"
            >
                {items.filter(item => item && (item.poster_path || item.backdrop_path || item.image)).map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className={`flex-shrink-0 snap-start transition-all duration-500 ${isLarge ? 'w-[45vw] sm:w-[220px] md:w-[260px] lg:w-[280px] max-w-[280px]' : 'w-[32vw] sm:w-[155px] md:w-[170px] lg:w-[180px] max-w-[180px]'}`}>
                        <MovieCard item={item} type={item.media_type || type} />
                    </div>
                ))}
            </div>
        </div>
    );
});
