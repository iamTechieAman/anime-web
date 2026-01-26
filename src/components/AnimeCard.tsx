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
            <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative aspect-[3/4.5] rounded-xl overflow-hidden cursor-pointer bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-purple-500/50 transition-colors shadow-xl"
            >
                {/* Image */}
                {show.thumbnail && !imageError ? (
                    <img
                        src={show.thumbnail}
                        alt={show.name}
                        onError={handleImageError}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-[0.7] group-hover:brightness-100"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-[var(--bg-card)] to-cyan-900/10 flex flex-col items-center justify-center p-4">
                        <Play className="w-16 h-16 text-purple-500/20 mb-3" />
                        <p className="text-[var(--text-main)] text-xs font-bold text-center line-clamp-3 opacity-60">{show.name}</p>
                    </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                    {show.availableEpisodes?.sub > 0 && (
                        <span className="px-2 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded shadow-lg">
                            SUB
                        </span>
                    )}
                    {show.availableEpisodes?.dub > 0 && (
                        <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded shadow-lg">
                            DUB
                        </span>
                    )}
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] transform scale-0 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                    </div>
                </div>

                {/* Info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--bg-card)] via-[var(--bg-card)]/80 to-transparent p-3 text-left z-10">
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-[var(--text-muted)]">
                        <span className="px-1.5 py-0.5 rounded bg-[var(--border-color)]">
                            {show.availableEpisodes?.sub || show.availableEpisodes?.dub || '?'} EPS
                        </span>
                    </div>
                    <h3 className="font-bold text-[var(--text-main)] text-sm line-clamp-2 group-hover:text-purple-500 transition-colors">
                        {show.name}
                    </h3>
                </div>
            </motion.div>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {shows.map((show) => (
                <AnimeCard key={show._id} show={show} />
            ))}
        </div>
    );
}
