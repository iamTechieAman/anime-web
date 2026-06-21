"use client";

import Image from "next/image";
import { useWatch } from "@/context/WatchContext";
import { Play, Clock, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

const PLACEHOLDER = "/tmdb_placeholder.webp";

const formatProgressStr = (current: number, total: number) => {
    if (!total || total <= 0) return '0%';
    return `${Math.min(100, Math.round((current / total) * 100))}%`;
};

const AnimatedProgressBar = ({ current, total }: { current: number, total: number }) => {
    const [width, setWidth] = useState('0%');
    useEffect(() => {
        const timer = setTimeout(() => {
            setWidth(formatProgressStr(current, total));
        }, 300);
        return () => clearTimeout(timer);
    }, [current, total]);

    return (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 rounded-b-2xl overflow-hidden pointer-events-none">
            <div 
                className="h-full bg-[var(--accent)] transition-[width] duration-1000 ease-out" 
                style={{ width }}
            />
        </div>
    );
};

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

    return (
        <section className="mb-8 w-full overflow-hidden">
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
                                className={`snap-start shrink-0 flex items-stretch rounded-2xl bg-[var(--bg-card)]/40 backdrop-blur-md border border-white/5 overflow-hidden transition-all duration-350 hover:border-[var(--accent)]/30 hover:shadow-2xl hover:scale-[1.02] relative ${
                                    isRemoving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                } h-[120px] md:h-[140px] lg:h-[160px] w-[220px] md:w-[250px] lg:w-[280px]`}
                            >
                                {/* Left Poster */}
                                <div className="w-[80px] md:w-[90px] lg:w-[100px] shrink-0 relative overflow-hidden bg-black/40 select-none group/poster">
                                    <Image
                                        src={entry.poster || PLACEHOLDER}
                                        alt={entry.title || "Continue watching"}
                                        fill
                                        sizes="(max-width: 768px) 80px, (max-width: 1024px) 90px, 100px"
                                        className="object-cover transition-transform duration-500 group-hover/poster:scale-105"
                                        onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement;
                                            if (target.src !== PLACEHOLDER) target.src = PLACEHOLDER;
                                        }}
                                        unoptimized
                                    />
                                    {/* Play Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                                        <Play className="w-5 h-5 text-white fill-current drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                                    </div>
                                    {/* Close button */}
                                    <button
                                        onClick={(e) => handleRemove(e, entry.id)}
                                        className="absolute top-1.5 left-1.5 z-20 p-1.5 bg-black/60 hover:bg-red-500 rounded-full transition-all duration-200 border border-white/10 backdrop-blur-sm cursor-pointer"
                                        aria-label="Remove from history"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </div>

                                {/* Right Content */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between p-3 md:p-3.5 lg:p-4 select-none pb-5">
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
                                            {entry.duration > 0 && (
                                                <span className="text-[9px] text-[var(--text-muted)] font-medium">
                                                    {timeLeft ? `${timeLeft} · ` : ""}{formatProgressStr(entry.currentTime, entry.duration)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Small Pill Resume */}
                                    <Link 
                                        href={getHistoryLink(entry)}
                                        className="px-3 py-1 bg-white/5 hover:bg-[var(--accent)] text-white hover:text-black rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 w-max border border-white/5 hover:border-transparent active:scale-95 shadow-sm hover:shadow-[0_0_12px_var(--accent-glow)]"
                                    >
                                        <Play className="w-2.5 h-2.5 fill-current" />
                                        <span>Resume</span>
                                    </Link>
                                </div>

                                {/* Animated progress bar at bottom */}
                                {entry.duration > 0 && (
                                    <AnimatedProgressBar current={entry.currentTime} total={entry.duration} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
