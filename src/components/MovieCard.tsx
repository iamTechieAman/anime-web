"use client";

import { useState, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { Play, Star, Flame } from "lucide-react";
import React from "react";
import { useTVNavigation } from "@/context/TVNavigationContext";

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
    isLive?: boolean;
    viewers?: string;
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
    const { deviceMode } = useTVNavigation();

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
        if (deviceMode === "tv") return;
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
            className={`card-reveal ${isVisible ? 'card-visible' : ''} ${isFeatured ? 'grid-featured' : ''} group relative transition-all duration-300 hover:scale-[1.06] hover:z-30 w-full h-full`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleMouseEnter}
            onTouchEnd={handleMouseLeave}
        >
        <Link 
            href={mediaType === 'anime' ? `/watch/anime/${item.id}` : `/watch/${mediaType}/${item.id}`} 
            data-focusable="true"
            className="block w-full h-full rounded-2xl outline-none focus:outline-none"
        >
            <div className="premium-card-container">
                {/* Poster Image */}
                {((item.poster_path || item.image) && !imgError) ? (
                    <img
                        src={item.poster_path ? `${IMG_BASE}/w342${item.poster_path}` : item.image}
                        srcSet={item.poster_path ? `${IMG_BASE}/w185${item.poster_path} 185w, ${IMG_BASE}/w342${item.poster_path} 342w` : undefined}
                        sizes="(max-width: 640px) 50vw, 20vw"
                        alt={`${title} (${year}) - Stream HD on ToonPlayer`}
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
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
                            <div className="h-full bg-[var(--accent)] w-1/3 animate-[pulse_2s_ease-in-out_infinite]" />
                        </div>
                        <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-widest border border-white/10">
                            Trailer Playing
                        </div>
                    </div>
                )}

                {/* Most Viewed badge */}
                {item.isMostViewed && (
                    <div className="absolute top-0 left-0 flex items-center gap-1 bg-[var(--accent)]/90 rounded-br-lg px-1.5 py-0.5 sm:px-2 sm:py-1 z-20 shadow-lg">
                        <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white fill-white" />
                        <span className="text-[7px] sm:text-[9px] font-bold text-white uppercase tracking-wider">
                            Most Viewed
                        </span>
                    </div>
                )}

                {/* Live Stream Badge */}
                {item.isLive && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 rounded px-1.5 py-0.5 z-20 shadow-lg border border-red-500/20 animate-pulse">
                        <span className="w-1 h-1 bg-white rounded-full" />
                        <span className="text-[7.5px] sm:text-[8px] font-black text-white uppercase tracking-widest">
                            LIVE
                        </span>
                    </div>
                )}

                {/* Viewer count for live streams */}
                {item.isLive && item.viewers && (
                    <div className="absolute bottom-2 left-2 bg-black/75 px-1.5 py-0.5 rounded text-[8px] font-black text-white tracking-widest border border-white/5 z-20 uppercase">
                        {item.viewers} VIEWERS
                    </div>
                )}

                {/* Rating badge (only when not live) */}
                {!item.isLive && (
                    <div className={`absolute left-2 flex items-center gap-1 bg-black/70 rounded-md px-2 py-0.5 z-10 ${item.isMostViewed ? 'top-8' : 'top-2'}`}>
                        <Star className="w-3 h-3 text-[var(--accent-warm)] fill-[var(--accent-warm)]" />
                        <span className="text-[11px] font-bold text-white">{rating}</span>
                    </div>
                )}

                {/* Upcoming or HD badge */}
                {isUpcoming ? (
                    <div className="absolute top-2 right-2 bg-[var(--accent)]/90 rounded px-1.5 py-0.5 z-20 shadow-lg border border-[var(--accent)]/30">
                        <span className="text-[9px] font-black text-white uppercase tracking-wider">
                            Upcoming
                        </span>
                    </div>
                ) : (
                    <div className="absolute top-2 right-2 hidden sm:block bg-[var(--accent)]/80 rounded px-1.5 py-0.5 z-10">
                        <span className="text-[9px] font-bold text-white tracking-wider">HD</span>
                    </div>
                )}

                {/* Premium Slide-Up Netflix-Style Overlay */}
                <div className="premium-card-overlay">
                    <div className="premium-card-overlay-content space-y-2">
                        {/* Play CTA Indicator */}
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-lg mb-1">
                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                        
                        <h4 className="text-xs font-black text-white line-clamp-2 leading-tight tracking-tight">{title}</h4>
                        
                        <div className="flex items-center gap-2 text-[9px] text-white/90 font-bold">
                            {matchPercent > 0 && (
                                <span className={`font-black ${matchPercent >= 70 ? "text-green-400" : matchPercent >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                                    {matchPercent}% Match
                                </span>
                            )}
                            {year && <span>• {year}</span>}
                        </div>

                        {/* Sub/Dub indicators */}
                        {(item.availableEpisodes?.sub || item.availableEpisodes?.dub) && (
                            <div className="flex gap-1 items-center shrink-0 border border-white/20 rounded-sm bg-black/40 overflow-hidden text-[8px] w-fit">
                                {(item.availableEpisodes?.sub ?? 0) > 0 && (
                                    <span className="px-1 py-0.5 font-medium border-r border-white/20 flex items-center gap-1 text-[#4ade80]">
                                        SUB {item.availableEpisodes.sub}
                                    </span>
                                )}
                                {(item.availableEpisodes?.dub ?? 0) > 0 && (
                                    <span className="px-1 py-0.5 font-medium text-[#c084fc] flex items-center gap-1">
                                        DUB {item.availableEpisodes.dub}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Always-visible compact metadata keeps dense OTT rows scannable. */}
            <div className="mt-2 px-0.5 pb-1">
                <h4 className="text-[11px] md:text-xs font-extrabold text-white line-clamp-1 leading-tight tracking-tight">{title}</h4>
                <div className="flex items-center gap-1.5 mt-1 text-[9px] md:text-[10px] text-[var(--text-muted)] font-bold">
                    {item.isLive ? (
                        <span className="text-red-500 font-extrabold flex items-center gap-1 animate-pulse">
                            ● LIVE
                        </span>
                    ) : rating ? (
                        <span className="text-[var(--accent-warm)] font-extrabold flex items-center gap-0.5">
                            ★{rating}
                        </span>
                    ) : null}
                    {year && (
                        <>
                            <span className="text-white/25">•</span>
                            <span>{year}</span>
                        </>
                    )}
                </div>
            </div>
        </Link>
        </div>
    );
});

// === MOVIE GRID ===
export const MovieGrid = memo(function MovieGrid({ items, type = "movie" }: { items: MovieItem[]; type?: string }) {
    const { isLowEnd } = useTVNavigation();
    const validItems = items.filter(item => item && (item.poster_path || item.backdrop_path || item.image));
    const finalItems = isLowEnd ? validItems.slice(0, 8) : validItems;
    return (
        <div className="responsive-grid">
            {finalItems.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="w-full">
                    <MovieCard item={item} type={item.media_type || type} isFeatured={idx === 0} />
                </div>
            ))}
        </div>
    );
});

// === MOVIE ROW (Horizontal Scroll) ===
export const MovieRow = memo(function MovieRow({ items, type = "movie", title, isLarge = false }: { items: MovieItem[]; type?: string; title?: string; isLarge?: boolean }) {
    const backupId = React.useId();
    const scrollId = `row-${String(title || backupId).replace(/\s/g, "-")}`;
    const { isLowEnd } = useTVNavigation();

    const validItems = items.filter(item => item && (item.poster_path || item.backdrop_path || item.image));
    const finalItems = isLowEnd ? validItems.slice(0, 10) : validItems;

    return (
        <div className="relative w-full mb-4 netflix-row-container">
            <div 
                id={scrollId} 
                className="netflix-row hide-scrollbar"
            >
                {finalItems.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className={`netflix-card-snap shrink-0 ${isLarge ? "large" : ""}`}>
                        <MovieCard item={item} type={item.media_type || type} />
                    </div>
                ))}
            </div>
        </div>
    );
});
