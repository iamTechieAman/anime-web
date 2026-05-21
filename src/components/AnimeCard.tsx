"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Play, Star, ChevronRight } from "lucide-react";

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

/** Gradient placeholder shown when image is missing or fails to load */
function ImagePlaceholder({ title }: { title: string }) {
    return (
        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <span className="text-zinc-600 text-3xl font-black select-none">{title.charAt(0).toUpperCase()}</span>
        </div>
    );
}

/** Resolves the best available image URL from a Show object */
function resolveImage(show: Show): string | null {
    if (show.image) return show.image;
    if (show.poster_path) return `https://image.tmdb.org/t/p/w342${show.poster_path}`;
    if (show.backdrop_path) return `https://image.tmdb.org/t/p/w500${show.backdrop_path}`;
    return null;
}

export default function AnimeCard({ show, isBanner = false }: { show: Show; isBanner?: boolean }) {
    const [isVisible, setIsVisible] = useState(false);
    const [imgError, setImgError] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.05, rootMargin: "100px" }
        );

        if (cardRef.current) observer.observe(cardRef.current);
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
    const imageSrc = resolveImage(show);
    const year = (show.release_date || show.first_air_date || "").split('-')[0];
    const rating = show.vote_average ? show.vote_average.toFixed(1) : null;

    return (
        <div ref={cardRef} className={`card-reveal ${isVisible ? 'card-visible' : ''} netflix-card-snap w-full`}>
            <Link href={getHref()} className="block group w-full h-full">
                <div className={`premium-card-container w-full ${isBanner ? 'aspect-[16/9] !h-auto' : 'aspect-[2/3]'}`}>
                    {/* Poster */}
                    {(imageSrc && !imgError) ? (
                        <img
                            src={imageSrc}
                            alt={title}
                            className="w-full h-full object-cover aspect-[2/3]"
                            loading="lazy"
                            decoding="async"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <ImagePlaceholder title={title} />
                    )}

                    {/* Rating badge */}
                    {rating && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 z-10 text-[10px] font-bold text-yellow-400">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {rating}
                        </div>
                    )}

                    {/* Premium Slide-Up Netflix-Style Overlay */}
                    <div className="premium-card-overlay">
                        <div className="premium-card-overlay-content space-y-2">
                            {/* Play CTA Indicator */}
                            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg mb-1">
                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                            </div>
                            
                            <h4 className="text-xs font-black text-white line-clamp-2 leading-tight tracking-tight">{title}</h4>
                            
                            <div className="flex items-center gap-2 text-[9px] text-white/90 font-bold">
                                <span className="text-green-400 font-black">98% Match</span>
                                {year && <span>• {year}</span>}
                            </div>

                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-white/90 font-black uppercase tracking-wider w-fit block border border-white/5">
                                {show.type || show.media_type || "ANIME"}
                            </span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}

export function AnimeCardHorizontal({ show, rank }: { show: Show; rank?: number }) {
    const [imgError, setImgError] = useState(false);
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
    const imageSrc = resolveImage(show);
    const rating = show.vote_average ? show.vote_average.toFixed(1) : null;

    return (
        <div key={`${showId}-${rank}`} className="card-reveal card-visible">
            <Link href={getHref()} className="group flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors items-center relative overflow-hidden">
                {rank !== undefined && (
                    <div className="w-6 text-center shrink-0">
                        <span className={`text-xl font-black ${rank < 3 ? 'text-[#FF5722]' : 'text-[var(--text-muted)]'}`}>
                            {rank + 1}
                        </span>
                    </div>
                )}

                {/* Thumbnail */}
                <div className="relative w-14 aspect-[2/3] rounded-md overflow-hidden bg-[var(--bg-card)] shrink-0 shadow-lg">
                    {(imageSrc && !imgError) ? (
                        <img
                            src={imageSrc}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                            decoding="async"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                            <span className="text-zinc-600 text-lg font-black">{title.charAt(0)}</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-current" />
                    </div>
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-orange-400 transition-colors tracking-tight">
                        {title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-orange-400/80 uppercase">
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
                <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-orange-500 transition-all duration-500 group-hover:w-full" />
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
