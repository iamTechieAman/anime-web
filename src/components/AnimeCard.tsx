"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

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

// Anime Card Component
export function AnimeCard({ show }: { show: Show }) {
    const [imageError, setImageError] = useState(false);

    const handleImageError = () => {
        setImageError(true);
    };

    return (
        <Link href={`/watch/${show._id}${show.provider ? `?provider=${show.provider}` : ''}`}>
            <div className="group flex flex-col gap-2 w-full cursor-pointer">
                <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative aspect-[3/4.5] rounded-sm overflow-hidden bg-[var(--bg-card)] transition-all duration-300 shadow-lg"
                >
                    {/* Image */}
                    {show.thumbnail && !imageError ? (
                        <img
                            src={show.thumbnail}
                            alt={show.name}
                            onError={handleImageError}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 flex flex-col items-center justify-center p-4">
                            <Play className="w-12 h-12 text-white/20 mb-3" />
                            <p className="text-[var(--text-main)] text-xs font-bold text-center line-clamp-3 opacity-60 font-sora">{show.name}</p>
                        </div>
                    )}

                    {/* Format/Type Badge (Top right) */}
                    <div className="absolute top-2 right-2 z-10">
                         <span className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md text-white border border-white/10 text-[9px] font-bold rounded-sm uppercase">
                            TV
                         </span>
                    </div>

                    {/* Episode Badges (Bottom left) */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10">
                        {show.availableEpisodes?.sub > 0 && (
                            <span className="px-1.5 py-0.5 bg-[#FF5722] text-white text-[10px] font-bold rounded-sm shadow-lg border border-white/10">
                                SUB {show.availableEpisodes.sub}
                            </span>
                        )}
                        {show.availableEpisodes?.dub > 0 && (
                            <span className="px-1.5 py-0.5 bg-[#FF5722]/80 text-white text-[10px] font-bold rounded-sm shadow-lg border border-white/10">
                                DUB {show.availableEpisodes.dub}
                            </span>
                        )}
                        {(!show.availableEpisodes?.sub && !show.availableEpisodes?.dub) && (
                            <span className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-sm border border-white/10">
                                EP ?
                            </span>
                        )}
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] transform scale-50 group-hover:scale-100 transition-transform duration-300 border border-white/30">
                            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                    </div>
                </motion.div>

                {/* Info Below Image */}
                <div className="flex flex-col gap-1 px-1">
                    <h3 className="font-semibold text-[var(--text-main)] text-sm line-clamp-1 group-hover:text-white transition-colors font-sora" title={show.name}>
                        {show.name}
                    </h3>
                </div>
            </div>
        </Link>
    );
}

// Anime Grid Component
export function AnimeGrid({ shows }: { shows: Show[] }) {
    if (!shows || shows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-[var(--text-muted)] mb-2">No anime found.</p>
            </div>
        )
    }
    return (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
            {shows.map((show) => (
                <AnimeCard key={show._id} show={show} />
            ))}
        </div>
    );
}

// Horizontal Anime Card for Sidebars
export function AnimeCardHorizontal({ show, rank }: { show: Show, rank?: number }) {
    const [imageError, setImageError] = useState(false);

    return (
        <Link href={`/watch/${show._id}${show.provider ? `?provider=${show.provider}` : ''}`} className="group flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-[var(--bg-card)] transition-colors">
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
    );
}
