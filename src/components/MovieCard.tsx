"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import Link from "next/link";
import { Play, Star, Flame, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import React from "react";
import Image from "next/image";

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

// === MOVIE CARD — Onoflix-inspired ContentCard design ===
export const MovieCard = memo(function MovieCard({ item, type = "movie", isFeatured = false }: { item: MovieItem; type?: string; isFeatured?: boolean }) {
    const [imgError, setImgError] = useState(false);
    const [liveViewers, setLiveViewers] = useState(item.liveViewers);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for lazy reveal
    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
            { rootMargin: "0px", threshold: 0.05 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Fluctuating live viewer count
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
    const rating = item.vote_average && item.vote_average > 0 ? item.vote_average.toFixed(1) : null;
    const rawMediaType = item.media_type || type;
    const mediaType = (rawMediaType && rawMediaType !== 'undefined')
        ? rawMediaType
        : (item.first_air_date || item.name ? 'tv' : 'movie');
    const watchHref = mediaType === 'anime' ? `/watch/anime/${item.id}` : `/watch/${mediaType}/${item.id}`;

    const posterSrc = item.poster_path ? `${IMG_BASE}/w342${item.poster_path}` : item.image;

    return (
        <div
            ref={cardRef}
            className={`group relative w-full card-virtualized transition-all duration-300 ease-out will-change-transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'} ${isFeatured ? 'col-span-1' : ''}`}
        >
            <Link href={watchHref} className="block w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-xl" draggable={false}>
                {/* === Poster Container === */}
                <div className="relative w-full overflow-hidden rounded-xl bg-zinc-900 shadow-md group-hover:shadow-2xl group-hover:shadow-black/60 transition-shadow duration-300" style={{ aspectRatio: '2/3' }}>
                    
                    {/* Shimmer skeleton while image loads */}
                    <div className="absolute inset-0 shimmer-card" />

                    {/* Poster Image */}
                    {(posterSrc && !imgError) ? (
                        <Image
                            src={posterSrc}
                            alt={`${title} (${year})`}
                            fill
                            sizes="(max-width: 480px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 20vw, 14vw"
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08] relative z-[1]"
                            placeholder="blur"
                            blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzIiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSIzIiBoZWlnaHQ9IjQiIGZpbGw9IiMxYTFhMWEiLz48L3N2Zz4="
                            onError={() => setImgError(true)}
                            loading="lazy"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col items-center justify-center gap-2 z-[1]">
                            <span className="text-3xl font-black text-zinc-700">{title.charAt(0)}</span>
                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest px-3 text-center line-clamp-2">{title}</span>
                        </div>
                    )}

                    {/* Bottom gradient overlay — always visible */}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[2] pointer-events-none" />

                    {/* Play button overlay on hover */}
                    <div className="absolute inset-0 z-[3] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="w-11 h-11 rounded-full bg-white/95 shadow-2xl flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-200">
                            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                        </div>
                    </div>

                    {/* Top badges */}
                    <div className="absolute top-0 left-0 right-0 z-[4] flex items-start justify-between p-2">
                        <div className="flex flex-col gap-1">
                            {item.isLive && (
                                <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" />LIVE
                                </span>
                            )}
                            {item.isMostViewed && (
                                <span className="inline-flex items-center gap-1 bg-[var(--accent)] text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                                    <Flame className="w-2.5 h-2.5 fill-white" />HOT
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {isUpcoming ? (
                                <span className="bg-yellow-500/90 text-black text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">Soon</span>
                            ) : (
                                <span className="bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded border border-white/10">HD</span>
                            )}
                        </div>
                    </div>

                    {/* Bottom metadata overlay — visible on hover */}
                    <div className="absolute inset-x-0 bottom-0 z-[5] p-2.5 translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        {/* Rating */}
                        {rating && (
                            <div className="flex items-center gap-1 mb-1">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-xs font-bold text-white">{rating}</span>
                            </div>
                        )}
                        <h4 className="text-[11px] font-bold text-white line-clamp-1 leading-tight">{title}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {year && <span className="text-[9px] text-white/70 font-medium">{year}</span>}
                            {(item.availableEpisodes?.sub || item.availableEpisodes?.dub) && (
                                <div className="flex gap-0.5 items-center text-[8px] font-bold">
                                    {(item.availableEpisodes?.sub ?? 0) > 0 && <span className="text-green-400">SUB</span>}
                                    {(item.availableEpisodes?.dub ?? 0) > 0 && <span className="text-purple-400 ml-0.5">DUB</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Below-card metadata — always visible, onoflix style */}
                <div className="mt-2 px-0.5">
                    <h4 className="text-[12px] md:text-[13px] font-semibold text-zinc-100 line-clamp-1 leading-snug group-hover:text-white transition-colors">{title}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500 font-medium">
                        {item.isLive ? (
                            <span className="text-red-500 font-bold flex items-center gap-1">● LIVE {liveViewers ? `· ${liveViewers.toLocaleString()}` : ''}</span>
                        ) : (
                            <>
                                {rating && <span className="text-yellow-500 font-bold">★ {rating}</span>}
                                {rating && year && <span className="text-zinc-700">·</span>}
                                {year && <span>{year}</span>}
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
    const validItems = items.filter(item => item && (item.poster_path || item.backdrop_path || item.image));
    return (
        <div className="responsive-grid">
            {validItems.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="w-full">
                    <MovieCard item={item} type={item.media_type || type} isFeatured={idx === 0} />
                </div>
            ))}
        </div>
    );
});

// === MOVIE ROW — Onoflix carousel with prev/next arrows ===
export const MovieRow = memo(function MovieRow({ items, type = "movie", title, isLarge = false }: { items: MovieItem[]; type?: string; title?: string; isLarge?: boolean }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 8);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        checkScroll();
        el.addEventListener('scroll', checkScroll, { passive: true });
        const ro = new ResizeObserver(checkScroll);
        ro.observe(el);
        return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
    }, [checkScroll, items]);

    const scroll = (dir: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const cardWidth = el.querySelector('[data-card]')?.clientWidth || 160;
        const visibleCards = Math.floor(el.clientWidth / cardWidth);
        const amount = cardWidth * Math.max(2, visibleCards - 1);
        el.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
    };

    const validItems = items.filter(item => item && (item.poster_path || item.backdrop_path || item.image));

    return (
        <div className="relative group/row w-full">
            {/* Prev arrow */}
            <button
                onClick={() => scroll('left')}
                aria-label="Scroll left"
                className={`absolute left-0 top-0 bottom-[52px] z-20 w-10 flex items-center justify-center bg-gradient-to-r from-[#09090B]/90 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 ${canScrollLeft ? '' : 'pointer-events-none !opacity-0'}`}
            >
                <div className="w-8 h-8 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center shadow-xl hover:bg-zinc-700 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-white" />
                </div>
            </button>

            {/* Scrollable row */}
            <div
                ref={scrollRef}
                className="netflix-row"
            >
                {validItems.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} data-card className="netflix-card-snap w-[140px] sm:w-[160px] md:w-[200px] lg:w-[220px]">
                        <MovieCard item={item} type={item.media_type || type} />
                    </div>
                ))}
            </div>

            {/* Next arrow */}
            <button
                onClick={() => scroll('right')}
                aria-label="Scroll right"
                className={`absolute right-0 top-0 bottom-[52px] z-20 w-10 flex items-center justify-center bg-gradient-to-l from-[#09090B]/90 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 ${canScrollRight ? '' : 'pointer-events-none !opacity-0'}`}
            >
                <div className="w-8 h-8 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center shadow-xl hover:bg-zinc-700 transition-colors">
                    <ChevronRight className="w-4 h-4 text-white" />
                </div>
            </button>
        </div>
    );
});
