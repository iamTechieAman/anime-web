"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Star } from "lucide-react";

export interface Show {
    _id: string;
    name: string;
    availableEpisodes: {
        sub: number;
        dub: number;
        raw: number;
    };
    thumbnail?: string;
    provider?: string;
    __typename: string;
}

export function AnimeCard({ show, showScore = true, isBanner = false, rank }: { show: any, showScore?: boolean, isBanner?: boolean, rank?: number }) {
    const [imageError, setImageError] = useState(false);
    const isHD = show.availableEpisodes?.sub > 0 || show.availableEpisodes?.dub > 0;

    // Route TMDB content to movie watch page
    const isTmdbContent = show._id?.startsWith('tmdb:');
    const getHref = () => {
        if (isTmdbContent) {
            // tmdb:movie:123 or tmdb:tv:456
            const parts = show._id.split(':');
            const type = parts[1]; // movie or tv
            const tmdbId = parts[2];
            return `/movies/watch/${type}/${tmdbId}`;
        }
        return `/watch/${show._id}${show.provider ? `?provider=${show.provider}` : ''}`;
    };

    const handleImageError = () => {
        setImageError(true);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{ scale: 1.04, transition: { duration: 0.3 } }}
            className={`group relative overflow-hidden rounded-xl bg-[var(--bg-card)] border border-white/5 hover:border-purple-500/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] hover:-translate-y-1 ${isBanner ? 'aspect-[16/9]' : 'aspect-[3/4.5]'}`}
        >
            <Link href={getHref()} className="block w-full h-full">
                {/* Ranking Number */}
                {rank !== undefined && (
                    <div className="absolute top-0 right-0 z-20 pointer-events-none drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                        <div className={`
                            w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-bl-xl backdrop-blur-md border-b border-l border-white/10
                            ${rank === 0 ? 'bg-gradient-to-br from-yellow-400/90 to-amber-600/90' : 
                              rank === 1 ? 'bg-gradient-to-br from-gray-300/90 to-gray-500/90' :
                              rank === 2 ? 'bg-gradient-to-br from-amber-700/90 to-amber-900/90' :
                              'bg-black/60'}
                        `}>
                            <span className="text-sm md:text-lg font-black text-white shadow-sm">
                                #{rank + 1}
                            </span>
                        </div>
                    </div>
                )}

                {/* Score badge */}
                {showScore && show.score && (
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md text-white/90 border border-white/10 shadow-lg">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-bold tracking-tight">{Math.round(show.score * 10)}%</span>
                    </div>
                )}

                {/* HD badge */}
                {isHD && (
                    <div className="absolute top-2 right-2 z-20 hidden md:block">
                        <div className="px-1.5 py-0.5 bg-blue-500/80 backdrop-blur-sm rounded text-[9px] font-black tracking-wider text-white shadow-lg border border-blue-400/30">
                            HD
                        </div>
                    </div>
                )}

                <div className="relative w-full h-full">
                    {/* Thumbnail Image */}
                    {show.thumbnail && !imageError ? (
                        <img
                            src={show.thumbnail}
                            alt={show.name}
                            onError={handleImageError}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 flex flex-col items-center justify-center p-4">
                            <Play className="w-12 h-12 text-white/20 mb-3" />
                            <p className="text-[var(--text-main)] text-xs font-bold text-center line-clamp-3 opacity-60 font-sora">{show.name}</p>
                        </div>
                    )}

                    {/* Gradient Overlays */}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300" />

                    {/* Info Container */}
                    <div className="absolute inset-x-0 bottom-0 p-2 md:p-3 flex flex-col justify-end transform transition-transform duration-300">
                        {/* Title */}
                        <h3 className="text-white font-bold text-sm md:text-base leading-tight line-clamp-2 md:line-clamp-1 group-hover:line-clamp-2 transition-all duration-300 text-shadow-sm font-sora">
                            {show.name}
                        </h3>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-2 mt-1.5 md:mt-2 text-[10px] md:text-xs text-white/70 overflow-hidden">
                            {(show.availableEpisodes?.sub > 0 || show.availableEpisodes?.dub > 0) && (
                                <div className="flex gap-1 items-center shrink-0 border border-white/20 rounded-sm bg-black/40 overflow-hidden">
                                    {show.availableEpisodes?.sub > 0 && (
                                        <span className="px-1 md:px-1.5 py-0.5 font-medium border-r border-white/20 flex items-center gap-1 text-[#4ade80]">
                                            <span className="hidden sm:inline">CC</span> {show.availableEpisodes.sub}
                                        </span>
                                    )}
                                    {show.availableEpisodes?.dub > 0 && (
                                        <span className="px-1 md:px-1.5 py-0.5 font-medium text-[#c084fc] flex items-center gap-1">
                                            <span className="hidden sm:inline">MIC</span> {show.availableEpisodes.dub}
                                        </span>
                                    )}
                                </div>
                            )}
                            <span className="w-1 h-1 rounded-full bg-white/30 shrink-0"></span>
                            <span className="font-medium shrink-0 uppercase tracking-wider">{show.type || "TV"}</span>
                            {isTmdbContent && (
                                <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] font-bold rounded-sm uppercase">TMDB</span>
                            )}
                        </div>
                    </div>

                    {/* Hover overlay with play button */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-purple-500 text-white flex items-center justify-center transform scale-50 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_20px_rgba(168,85,247,0.6)]">
                            <Play className="w-6 h-6 md:w-8 md:h-8 fill-current ml-1" />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

// Anime Grid Component
export function AnimeGrid({ shows, prefix = "anime" }: { shows: Show[], prefix?: string }) {
    if (!shows || shows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-[var(--text-muted)] mb-2">No anime found.</p>
            </div>
        )
    }
    return (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
            {shows.map((show, idx) => (
                <AnimeCard key={`${prefix}-${show._id}-${idx}`} show={show} />
            ))}
        </div>
    );
}

// Horizontal Anime Card for Sidebars
export function AnimeCardHorizontal({ show, rank }: { show: Show, rank?: number }) {
    const [imageError, setImageError] = useState(false);
    const showWithScore = show as any;
    const matchScore = showWithScore.score ? Math.round(showWithScore.score * 10) : null;

    // Route TMDB content to movie watch page
    const isTmdbContent = show._id?.startsWith('tmdb:');
    const getHref = () => {
        if (isTmdbContent) {
            const parts = show._id.split(':');
            const type = parts[1];
            const tmdbId = parts[2];
            return `/movies/watch/${type}/${tmdbId}`;
        }
        return `/watch/${show._id}${show.provider ? `?provider=${show.provider}` : ''}`;
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.3 }}
            key={`${show._id}-${rank}`}
        >
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
            <div className="relative w-14 h-20 rounded-sm overflow-hidden shrink-0 bg-[var(--bg-card)] shadow-md">
                {show.thumbnail && !imageError ? (
                    <img
                        src={show.thumbnail}
                        alt={show.name}
                        onError={() => setImageError(true)}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white/20" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex border-b border-[var(--border-color)] group-hover:border-transparent pb-3 flex-col justify-center min-w-0 flex-1">
                <h4 className="font-semibold text-sm text-[var(--text-main)] group-hover:text-[#FF5722] transition-colors line-clamp-2 leading-snug font-sora">
                    {show.name}
                </h4>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {show.availableEpisodes?.sub > 0 && (
                        <span className="text-[9px] px-1 bg-[#FF5722]/10 text-[#FF5722] border border-[#FF5722]/20 rounded-sm font-bold">CC {show.availableEpisodes.sub}</span>
                    )}
                    {show.availableEpisodes?.dub > 0 && (
                        <span className="text-[9px] px-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-sm font-bold">MIC {show.availableEpisodes.dub}</span>
                    )}
                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]/50"></span>
                        TV
                    </span>
                </div>
            </div>
        </Link>
        </motion.div>
    );
}
