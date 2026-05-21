"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Play, Star, Calendar, Clock, ChevronRight } from "lucide-react";

export interface Show {
    _id?: string;
    id?: string;
    title: string;
    name?: string;
    image?: string;
    poster_path?: string;
    backdrop_path?: string;
    type?: string;
    media_type?: string;
    release_date?: string;
    first_air_date?: string;
    vote_average?: number;
    quality?: string;
    provider?: string;
    rank?: number;
}

export default function AnimeCard({ show, isBanner = false }: { show: Show; isBanner?: boolean }) {
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const showId = show._id || show.id;
    const isTmdbContent = showId?.startsWith('tmdb:');
    const getHref = () => {
        if (!showId) return '/';
        if (isTmdbContent) {
            const parts = showId.split(':');
            const type = parts[1] || 'movie';
            const tmdbId = parts[2] || parts[1];
            return `/watch/${type}/${tmdbId}`;
        }
        const provider = show.provider || (showId?.startsWith('hi:') ? 'hianime' : showId?.startsWith('aw:') ? 'aniwatch' : 'allanime');
        return `/watch/anime/${showId}?provider=${provider}`;
    };

    const title = show.title || show.name || "Unknown Title";
    const image = show.image || (show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : show.backdrop_path ? `https://image.tmdb.org/t/p/w500${show.backdrop_path}` : "https://api.dicebear.com/9.x/shapes/svg?seed=fallback");
    const year = (show.release_date || show.first_air_date || "").split('-')[0];
    const rating = show.vote_average ? show.vote_average.toFixed(1) : null;

    return (
        <div
            ref={cardRef}
            className={`card-reveal ${isVisible ? 'card-visible' : ''}`}
        >
            <Link href={getHref()} className={`group relative overflow-hidden rounded-xl bg-[var(--bg-card)] border border-white/5 hover:border-purple-500/40 transition-colors duration-150 block w-full h-full ${isBanner ? 'aspect-[16/9]' : 'aspect-[3/4.5]'}`}>
                <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_20px_rgba(147,51,234,0.5)]">
                            <Play className="w-6 h-6 text-white fill-current ml-1" />
                        </div>
                    </div>
                </div>

                {/* Top Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                    {rating && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-yellow-400">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {rating}
                        </div>
                    )}
                </div>

                {/* Bottom Info (only if not banner) */}
                {!isBanner && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 to-transparent">
                        <h3 className="text-white text-xs font-bold line-clamp-2 leading-tight group-hover:text-purple-400 transition-colors">
                            {title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                            {year && <span className="text-[10px] text-white/50 font-medium">{year}</span>}
                            <span className="text-[10px] px-1 rounded bg-white/10 text-white/70 font-bold uppercase tracking-tighter">
                                {show.type || show.media_type || "HD"}
                            </span>
                        </div>
                    </div>
                )}
            </Link>
        </div>
    );
}

export function AnimeCardHorizontal({ show, rank }: { show: Show; rank?: number }) {
    const showId = show._id || show.id;
    const isTmdbContent = showId?.startsWith('tmdb:');
    const getHref = () => {
        if (!showId) return '/';
        if (isTmdbContent) {
            const parts = showId.split(':');
            const type = parts[1] || 'movie';
            const tmdbId = parts[2] || parts[1];
            return `/watch/${type}/${tmdbId}`;
        }
        const provider = show.provider || (showId?.startsWith('hi:') ? 'hianime' : showId?.startsWith('aw:') ? 'aniwatch' : 'allanime');
        return `/watch/anime/${showId}?provider=${provider}`;
    };
    
    const title = show.title || show.name || "Unknown Title";
    const image = show.image || (show.poster_path ? `https://image.tmdb.org/t/p/w200${show.poster_path}` : "https://api.dicebear.com/9.x/shapes/svg?seed=fallback");
    const rating = show.vote_average ? show.vote_average.toFixed(1) : null;

    return (
        <div key={`${showId}-${rank}`} className="card-reveal card-visible">
            <Link href={getHref()} className="group flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors items-center relative overflow-hidden">
                {/* Rank Number (if provided) */}
                {rank !== undefined && (
                    <div className="w-6 text-center shrink-0">
                        <span className={`text-xl font-black ${rank < 3 ? 'text-[#FF5722]' : 'text-[var(--text-muted)]'}`}>
                            {rank + 1}
                        </span>
                    </div>
                )}

                {/* Thumbnail */}
                <div className="relative w-14 aspect-[2/3] rounded-md overflow-hidden bg-[var(--bg-card)] shrink-0 shadow-lg">
                    <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-current" />
                    </div>
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-purple-400 transition-colors tracking-tight">
                        {title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-purple-400/80 uppercase">
                            {show.type || show.media_type || "TV"}
                        </span>
                        {rating && (
                            <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                {rating}
                            </div>
                        )}
                    </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
                
                {/* Glow on hover */}
                <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-purple-600 transition-all duration-500 group-hover:w-full" />
            </Link>
        </div>
    );
}

export function AnimeGrid({ shows }: { shows: Show[] }) {
    if (!shows || shows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-[var(--text-muted)] mb-2">No anime found.</p>
            </div>
        );
    }
    const validShows = shows.filter(show => show && (show.image || show.poster_path || show.backdrop_path || show.title || show.name));
    return (
        <div className="responsive-grid">
            {validShows.map((show, i) => (
                <AnimeCard key={`${show._id || show.id || i}-${i}`} show={show} />
            ))}
        </div>
    );
}

