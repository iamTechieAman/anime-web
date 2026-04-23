"use client";

import { useWatch } from "@/context/WatchContext";
import { Play, Clock, X, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

export default function ContinueWatchingRow() {
    const { history, removeFromHistory } = useWatch();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    if (!history || history.length === 0) return null;

    const getHistoryLink = (entry: any) => {
        if (entry.type === 'movie') {
            return `/watch/movie/${entry.showId}`;
        }
        if (entry.type === 'tv') {
            const season = entry.season || 1;
            const episode = entry.episodeId || entry.episodeNumber || 1;
            return `/watch/tv/${entry.showId}?s=${season}&e=${episode}`;
        }
        return `/watch/anime/${entry.showId}?ep=${entry.episodeId || 1}`;
    };

    const formatProgress = (current: number, total: number) => {
        if (!total || total <= 0) return '0%';
        return `${Math.min(100, Math.round((current / total) * 100))}%`;
    };

    const formatTimeLeft = (current: number, total: number) => {
        if (!total || total <= 0 || !current) return null;
        const secondsLeft = Math.max(0, total - current);
        const minutes = Math.floor(secondsLeft / 60);
        if (minutes <= 0) return null;
        return `${minutes} min left`;
    };

    const handleRemove = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setRemovingId(id);
        // Brief animation delay before removal
        setTimeout(() => {
            removeFromHistory(id);
            setRemovingId(null);
        }, 200);
    };

    const scroll = (direction: "left" | "right") => {
        if (!scrollContainerRef.current) return;
        const scrollAmount = scrollContainerRef.current.clientWidth * 0.75;
        scrollContainerRef.current.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
        });
    };

    return (
        <section className="mb-10 w-full overflow-hidden">
            <div className="section-header">
                <div className="accent-bar" />
                <Clock className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg md:text-xl font-bold font-sora">Continue Watching</h2>
                <span className="text-xs text-[var(--text-muted)] font-medium ml-auto">{history.length} items</span>
            </div>
            
            <div className="relative group/cw">
                {/* Scroll arrows (desktop) */}
                <button
                    onClick={() => scroll("left")}
                    className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-[var(--bg-main)] to-transparent hidden md:flex items-center justify-center opacity-0 group-hover/cw:opacity-100 transition-opacity"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                    onClick={() => scroll("right")}
                    className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-[var(--bg-main)] to-transparent hidden md:flex items-center justify-center opacity-0 group-hover/cw:opacity-100 transition-opacity"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="w-5 h-5 text-white" />
                </button>

                <div 
                    ref={scrollContainerRef}
                    className="flex items-center gap-3 md:gap-4 overflow-x-auto hide-scrollbar pb-4 scroll-smooth-x"
                >
                    {history.slice(0, 12).map((entry) => {
                        const timeLeft = formatTimeLeft(entry.currentTime, entry.duration);
                        const isRemoving = removingId === entry.id;
                        
                        return (
                            <Link
                                key={entry.id}
                                href={getHistoryLink(entry)}
                                className={`group relative flex-none w-[200px] md:w-[280px] aspect-video rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden transition-all duration-300 hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(139,92,246,0.15)] snap-start ${
                                    isRemoving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                }`}
                            >
                                {/* Poster/Backdrop */}
                                <div className="absolute inset-0 w-full h-full">
                                    <img 
                                        src={entry.poster || "https://api.dicebear.com/9.x/shapes/svg?seed=fallback"} 
                                        alt={entry.title} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                                </div>

                                {/* Remove button */}
                                <button
                                    onClick={(e) => handleRemove(e, entry.id)}
                                    className="absolute top-2 right-2 z-20 p-1.5 bg-black/60 hover:bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                                    aria-label="Remove from history"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>

                                {/* Title and info */}
                                <div className="absolute bottom-3 left-3 right-3 z-10">
                                    <h3 className="font-bold text-sm md:text-base text-white line-clamp-1 font-sora drop-shadow-lg">
                                        {entry.title}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {entry.episodeId && (
                                            <p className="text-[10px] md:text-xs text-purple-300 font-medium">
                                                {entry.type === 'tv' ? `S1 E${entry.episodeId}` : `EP ${entry.episodeNumber || entry.episodeId}`}
                                            </p>
                                        )}
                                        {timeLeft && (
                                            <p className="text-[10px] text-white/40 font-medium">
                                                • {timeLeft}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Play overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
                                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30">
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all" 
                                        style={{ width: formatProgress(entry.currentTime, entry.duration) }}
                                    />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
