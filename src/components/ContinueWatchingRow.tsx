"use client";

import { useWatch } from "@/context/WatchContext";
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
        setTimeout(() => {
            removeFromHistory(id);
            setRemovingId(null);
        }, 200);
    };

    // Progress Bar Sub-component to handle animation on mount
    const AnimatedProgressBar = ({ current, total }: { current: number, total: number }) => {
        const [width, setWidth] = useState('0%');
        useEffect(() => {
            const timer = setTimeout(() => {
                setWidth(formatProgress(current, total));
            }, 300);
            return () => clearTimeout(timer);
        }, [current, total]);

        return (
            <div className="h-[4px] bg-white/10 rounded-full overflow-hidden w-full relative">
                <div 
                    className="h-full bg-[var(--accent)] transition-[width] duration-1000 ease-out rounded-full" 
                    style={{ width }}
                />
            </div>
        );
    };

    return (
        <section className="mb-8 w-full overflow-hidden px-4 md:px-8">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-[var(--accent)] rounded-full shadow-[0_0_10px_var(--accent-glow)]" />
                <Clock className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-base md:text-lg font-black font-sora tracking-tight text-white">Continue Watching</h2>
            </div>
            
            <div className="w-full">
                <div className="flex items-center gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-2">
                    {displayHistory.slice(0, 5).map((entry) => {
                        const timeLeft = formatTimeLeft(entry.currentTime, entry.duration);
                        const isRemoving = removingId === entry.id;
                        
                        return (
                            <div
                                key={entry.id}
                                className={`snap-start shrink-0 flex items-stretch rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden transition-all duration-350 hover:border-[var(--accent)]/30 hover:shadow-2xl hover:scale-[1.02] relative ${
                                    isRemoving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                } h-[120px] md:h-[150px] lg:h-[180px] w-[220px] md:w-[270px] lg:w-[310px]`}
                            >
                                {/* Left Poster */}
                                <div className="w-[80px] md:w-[95px] lg:w-[110px] shrink-0 relative overflow-hidden bg-black/40 select-none">
                                    <img 
                                        src={entry.poster || "https://api.dicebear.com/9.x/shapes/svg?seed=fallback"} 
                                        alt={entry.title} 
                                        className="w-full h-full object-cover transition-transform duration-500"
                                        loading="lazy"
                                    />
                                    {/* Close button */}
                                    <button
                                        onClick={(e) => handleRemove(e, entry.id)}
                                        className="absolute top-1.5 left-1.5 z-20 p-1 bg-black/60 hover:bg-red-500/90 rounded-full transition-all duration-300 border border-white/10 backdrop-blur-sm cursor-pointer"
                                        aria-label="Remove from history"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </div>

                                {/* Right Content */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between p-3 md:p-3.5 lg:p-4 select-none">
                                    <div className="space-y-1">
                                        <Link href={getHistoryLink(entry)} className="block group/link">
                                            <h3 className="font-black text-xs sm:text-sm text-white line-clamp-1 font-sora tracking-tight group-hover/link:text-[var(--accent)] transition-colors">
                                                {entry.title}
                                            </h3>
                                        </Link>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {entry.episodeId && (
                                                <span className="text-[9px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded border border-[var(--accent)]/20">
                                                    {entry.type === 'tv' ? `S1 · E${entry.episodeId}` : `EP ${entry.episodeNumber || entry.episodeId}`}
                                                </span>
                                            )}
                                            {timeLeft && (
                                                <span className="text-[9px] text-[var(--text-muted)] font-medium">
                                                    {timeLeft}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress Bar & Percentage */}
                                    {entry.duration > 0 && (
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[8px] font-bold text-[var(--text-muted)]">
                                                <span>PROGRESS</span>
                                                <span>{formatProgress(entry.currentTime, entry.duration)}</span>
                                            </div>
                                            <AnimatedProgressBar current={entry.currentTime} total={entry.duration} />
                                        </div>
                                    )}

                                    {/* Small Pill Resume */}
                                    <Link 
                                        href={getHistoryLink(entry)}
                                        className="px-3 py-1 bg-white/5 hover:bg-[var(--accent)] text-white hover:text-black rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 w-max border border-white/5 hover:border-transparent active:scale-95 shadow-sm hover:shadow-[0_0_12px_rgba(255,157,0,0.3)]"
                                    >
                                        <Play className="w-2.5 h-2.5 fill-current" />
                                        <span>Resume</span>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
