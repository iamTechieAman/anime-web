"use client";

import { useState, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { Play, Star, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useUserStore, isKidsFriendly } from "@/store/userStore";

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

/** Clean string utility to filter out invalid values */
function cleanString(str: any): string | null {
    if (!str) return null;
    const s = String(str).trim();
    if (/^(unknown|undefined|null|no image|no img|no_image|no_img|placeholder|none)$/i.test(s)) return null;
    return s;
}

/** Gradient placeholder shown when image is missing or fails to load */
function ImagePlaceholder({ title }: { title: string }) {
    return (
        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <span className="text-zinc-600 text-3xl font-black select-none">{title.charAt(0).toUpperCase()}</span>
        </div>
    );
}

/** Resolves the best available image URL from a Show object using the requested fallback chain */
function resolveImage(show: Show): string | null {
    const banner = cleanString((show as any).banner);
    if (banner) return banner;

    const backdrop = cleanString(show.backdrop_path) || cleanString((show as any).backdrop);
    if (backdrop) {
        if (backdrop.startsWith('http') || backdrop.startsWith('/')) return backdrop;
        return `https://image.tmdb.org/t/p/w500${backdrop}`;
    }

    const poster = cleanString(show.image) || cleanString(show.poster_path) || cleanString((show as any).poster);
    if (poster) {
        if (poster.startsWith('http') || poster.startsWith('/')) return poster;
        return `https://image.tmdb.org/t/p/w342${poster}`;
    }

    return null;
}

const AnimeCard = memo(function AnimeCard({ show, isBanner = false }: { show: Show; isBanner?: boolean }) {
    const [imgError, setImgError] = useState(false);

    const showId = show._id || show.id;
    const isTmdbContent = showId?.startsWith('tmdb:');
    const getHref = () => {
        if (!showId) return '/';
        if (isTmdbContent) {
            const parts = showId.split(':');
            const type = parts[1] || 'movie';
            const tmdbId = parts[2] || parts[1];
            return `/watch/${type}/${encodeURIComponent(tmdbId)}`;
        }
        const provider = show.provider || (showId?.startsWith('hi:') ? 'hianime' : showId?.startsWith('aw:') ? 'aniwatch' : undefined);
        return provider 
            ? `/watch/anime/${encodeURIComponent(showId)}?provider=${encodeURIComponent(provider)}`
            : `/watch/anime/${encodeURIComponent(showId)}`;
    };

    const title = cleanString(show.title) || cleanString(show.name) || "Anime Masterpiece";
    const imageSrc = resolveImage(show);
    const year = (show.release_date || show.first_air_date || "").split('-')[0];
    const rating = show.vote_average ? show.vote_average.toFixed(1) : null;
    const typeLabel = cleanString(show.type) || cleanString(show.media_type) || "ANIME";

    return (
        <div className="card-reveal card-visible group relative transition-all duration-300 hover:z-30 w-full h-full">
            <Link href={getHref()} scroll={false} className="block w-full h-full">
                <div className={`relative w-full ${isBanner ? 'aspect-[16/9] !h-auto' : 'aspect-[2/3]'} rounded-2xl overflow-hidden bg-zinc-900 border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/20 group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.8)]`}>
                    {/* Poster */}
                    {(imageSrc && !imgError) ? (
                        <div className="relative w-full h-full overflow-hidden">
                            <Image
                                src={imageSrc}
                                alt={title}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 15vw"
                                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 will-change-transform" 
                                placeholder="blur"
                                blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzIiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSIzIiBoZWlnaHQ9IjQiIGZpbGw9IiMxYTFhMWEiLz48L3N2Zz4="
                                loading="lazy"
                                onError={() => setImgError(true)}
                            />
                        </div>
                    ) : (
                        <ImagePlaceholder title={title} />
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
                        {rating ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-black text-amber-300 border border-white/10 shadow-sm">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                {rating}
                            </div>
                        ) : <span />}

                        <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[9px] font-black uppercase tracking-wider text-accent border border-accent/20 shadow-sm">
                            {typeLabel}
                        </span>
                    </div>

                    {/* Hover Overlay with Quick Play Button */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5 z-10">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-accent to-accent-warm flex items-center justify-center shadow-[0_0_16px_var(--accent-glow)] mb-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                        <h4 className="text-xs font-black text-white line-clamp-1 leading-tight tracking-tight">{title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-300 font-bold">
                            <span className="text-emerald-400 font-black">HD</span>
                            {year && <span>• {year}</span>}
                        </div>
                    </div>
                </div>

                {/* Bottom Metadata Block */}
                <div className="mt-2.5 px-1 pb-1">
                    <h4 className="text-xs font-black text-white line-clamp-1 leading-tight tracking-tight group-hover:text-accent transition-colors">
                        {title}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-400 font-semibold">
                        {year && <span>{year}</span>}
                        {year && <span className="text-zinc-600">•</span>}
                        <span className="text-accent uppercase font-black text-[9px] tracking-wider">
                            {typeLabel}
                        </span>
                    </div>
                </div>
            </Link>
        </div>
    );
});

export const AnimeCardHorizontal = memo(function AnimeCardHorizontal({ show, rank }: { show: Show; rank?: number }) {
    const [imgError, setImgError] = useState(false);
    const showId = show._id || show.id;
    const isTmdbContent = showId?.startsWith('tmdb:');
    const getHref = () => {
        if (!showId) return '/';
        if (isTmdbContent) {
            const parts = showId.split(':');
            const type = parts[1] || 'movie';
            const tmdbId = parts[2] || parts[1];
            return `/watch/${type}/${encodeURIComponent(tmdbId)}`;
        }
        const provider = show.provider || (showId?.startsWith('hi:') ? 'hianime' : showId?.startsWith('aw:') ? 'aniwatch' : undefined);
        return provider 
            ? `/watch/anime/${encodeURIComponent(showId)}?provider=${encodeURIComponent(provider)}`
            : `/watch/anime/${encodeURIComponent(showId)}`;
    };

    const title = cleanString(show.title) || cleanString(show.name) || "Anime Masterpiece";
    const imageSrc = resolveImage(show);
    const rating = show.vote_average ? show.vote_average.toFixed(1) : null;
    const typeLabel = cleanString(show.type) || cleanString(show.media_type) || "TV";

    return (
        <div key={`${showId}-${rank}`} className="card-reveal card-visible">
            <Link href={getHref()} scroll={false} className="group flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors items-center relative overflow-hidden">
                {rank !== undefined && (
                    <div className="w-6 text-center shrink-0">
                        <span className={`text-xl font-black ${rank < 3 ? 'text-accent' : 'text-[var(--text-muted)]'}`}>
                            {rank + 1}
                        </span>
                    </div>
                )}

                {/* Thumbnail */}
                <div className="relative w-14 aspect-[2/3] rounded-md overflow-hidden bg-bg-card shrink-0 shadow-lg">
                    {(imageSrc && !imgError) ? (
                        <Image
                            src={imageSrc}
                            alt={title}
                            fill
                            sizes="56px"
                            className="object-cover transition-transform duration-[250ms] group-hover:scale-110 will-change-transform" 
                            loading="lazy"
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
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-accent transition-colors tracking-tight">
                        {title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-accent/80 uppercase">
                            {typeLabel}
                        </span>
                        {rating && (
                            <div className="flex items-center gap-1 text-[10px] text-accent-warm font-bold">
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
                <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-accent transition-all duration-[250ms] group-hover:w-full" />
            </Link>
        </div>
    );
});

export function AnimeGrid({ shows }: { shows: Show[] }) {
    const { profiles, activeProfileId } = useUserStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const isKidsMode = activeProfile?.isKids || false;
    const showsList = Array.isArray(shows) ? shows : [];
    const filteredShows = isKidsMode ? showsList.filter(show => show && isKidsFriendly(show as any)) : showsList;

    if (!filteredShows || filteredShows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-4 md:py-6 text-center">
                <p className="text-[var(--text-muted)] mb-2">No anime found.</p>
            </div>
        );
    }
    const validShows = filteredShows.filter(show => show && (show.image || show.poster_path || show.backdrop_path || show.title || show.name));
    return (
        <div className="responsive-grid">
            {validShows.map((show, i) => (
                <AnimeCard key={`${show._id || show.id || i}-${i}`} show={show} />
            ))}
        </div>
    );
}

export default AnimeCard;
