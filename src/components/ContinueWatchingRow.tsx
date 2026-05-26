"use client";

import { useWatch, type WatchHistoryItem } from "@/context/WatchContext";
import { Play, Clock, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function ContinueWatchingRow() {
    const { history, removeFromHistory } = useWatch();
    const [removingId, setRemovingId] = useState<string | null>(null);

    const displayHistory = history || [];

    if (displayHistory.length === 0) return null;


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

    // Progress Bar Sub-component to handle animation on mount
    const AnimatedProgressBar = ({ current, total }: { current: number, total: number }) => {
        const [width, setWidth] = useState('0%');
        useEffect(() => {
            // Small delay to trigger CSS transition on mount
            const timer = setTimeout(() => {
                setWidth(formatProgress(current, total));
            }, 300);
            return () => clearTimeout(timer);
        }, [current, total]);

        return (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30 overflow-hidden">
                <div 
                    className="h-full bg-red-600 transition-[width] duration-1000 ease-out" 
                    style={{ width }}
                />
            </div>
        );
    };

    return (
        <section className="mb-6 md:mb-8 w-full overflow-hidden">
            <div className="section-header">
                <div className="accent-bar" />
                <Clock className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg md:text-xl font-bold font-sora">Continue Watching</h2>
                <span className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] font-semibold">{displayHistory.length} {history.length === 0 ? 'Featured' : 'items'}</span>
                </span>
            </div>
            
            <div className="relative group/cw">
                <div className="continue-grid">
                    {displayHistory.slice(0, 12).map((entry) => {
                        const timeLeft = formatTimeLeft(entry.currentTime, entry.duration);
                        const isRemoving = removingId === entry.id;
                        
                        return (
                            <Link
                                key={entry.id}
                                href={getHistoryLink(entry)}
                                className={`group relative min-w-0 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden transition-all duration-400 ease-out hover:border-orange-500/50 hover:shadow-[0_8px_40px_-8px_rgba(249,115,22,0.4)] hover:-translate-y-2 ${
                                    isRemoving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                }`}
                            >
                                {/* Thumbnail with aspect-video */}
                                <div className="relative aspect-video overflow-hidden">
                                    <img 
                                        src={entry.poster || "https://api.dicebear.com/9.x/shapes/svg?seed=fallback"} 
                                        alt={entry.title} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                                    {/* Remove button */}
                                    <button
                                        onClick={(e) => handleRemove(e, entry.id)}
                                        className="absolute top-2.5 right-2.5 z-20 p-1.5 bg-black/70 hover:bg-red-500/90 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/10 backdrop-blur-sm"
                                        aria-label="Remove from history"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>

                                    {/* Play overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                        <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center border-2 border-white shadow-[0_0_30px_rgba(255,255,255,0.3)] transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                            <Play className="w-6 h-6 text-black fill-black ml-0.5" />
                                        </div>
                                    </div>

                                    {/* Animated Progress Bar */}
                                    <AnimatedProgressBar current={entry.currentTime} total={entry.duration} />
                                </div>

                                {/* Metadata section */}
                                <div className="p-3.5 space-y-2">
                                    {/* Title */}
                                    <h3 className="font-bold text-sm text-white line-clamp-1 font-sora tracking-tight">
                                        {entry.title}
                                    </h3>
                                    {/* Episode + time meta row */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {entry.episodeId && (
                                                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                                                    {entry.type === 'tv' ? `S1 · E${entry.episodeId}` : `EP ${entry.episodeNumber || entry.episodeId}`}
                                                </span>
                                            )}
                                            {timeLeft && (
                                                <span className="text-[10px] text-[var(--text-muted)] font-medium flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />{timeLeft}
                                                </span>
                                            )}
                                        </div>
                                        {/* Progress percentage */}
                                        {entry.duration > 0 && (
                                            <span className="text-[10px] font-bold text-[var(--text-muted)]">
                                                {formatProgress(entry.currentTime, entry.duration)}
                                            </span>
                                        )}
                                    </div>
                                    {/* Resume button */}
                                    <div className="pt-1">
                                        <div className="w-full py-2 rounded-xl bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/30 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 group-hover:bg-orange-500/15 group-hover:border-orange-500/30">
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            Resume
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
