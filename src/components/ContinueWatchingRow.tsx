"use client";

import { useWatch } from "@/context/WatchContext";
import { Play, Clock } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

export default function ContinueWatchingRow() {
    const { history } = useWatch();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    if (!history || history.length === 0) return null;

    const getHistoryLink = (entry: any) => {
        if (entry.type === 'movie' || entry.type === 'tv') {
            return `/watch/${entry.type}/${entry.showId}?e=${entry.episodeId || ''}`;
        }
        return `/watch/anime/${entry.showId}?ep=${entry.episodeId || 1}`;
    };

    const formatProgress = (current: number, total: number) => {
        if (!total || total <= 0) return '0%';
        return `${Math.min(100, Math.round((current / total) * 100))}%`;
    };

    return (
        <section className="mb-10 w-full overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg md:text-xl font-bold font-sora">Continue Watching</h2>
            </div>
            
            <div 
                ref={scrollContainerRef}
                className="flex items-center gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x"
                style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
            >
                {history.slice(0, 10).map((entry) => (
                    <Link
                        key={entry.id}
                        href={getHistoryLink(entry)}
                        className="group relative flex-none w-[200px] md:w-[280px] aspect-video rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden transition-all hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] snap-start"
                    >
                        {/* Poster Base */}
                        <div className="absolute inset-0 w-full h-full">
                            <img 
                                src={entry.poster || "https://api.dicebear.com/9.x/shapes/svg?seed=fallback"} 
                                alt={entry.title} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                                decoding="async"
                            />
                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                        </div>

                        {/* Title and Badge */}
                        <div className="absolute bottom-3 left-3 right-3 z-10">
                            <h3 className="font-bold text-sm md:text-base text-white line-clamp-1 font-sora drop-shadow-md">
                                {entry.title}
                            </h3>
                            {entry.episodeId && (
                                <p className="text-[10px] md:text-xs text-purple-300 font-medium drop-shadow-md mt-0.5">
                                    {entry.type === 'tv' ? `Episode ${entry.episodeId}` : `Episode ${entry.episodeNumber || entry.episodeId}`}
                                </p>
                            )}
                        </div>

                        {/* Play Icon Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30">
                            <div 
                                className="h-full bg-purple-500" 
                                style={{ width: formatProgress(entry.currentTime, entry.duration) }}
                            />
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
