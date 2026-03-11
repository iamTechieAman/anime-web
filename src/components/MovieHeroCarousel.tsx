"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Play, Info, Star, ChevronLeft, ChevronRight } from "lucide-react";

interface HeroItem {
    id: number;
    title?: string;
    name?: string;
    backdrop_path?: string | null;
    overview?: string;
    vote_average: number;
    release_date?: string;
    first_air_date?: string;
    media_type?: string;
}

const IMG_BASE = "https://image.tmdb.org/t/p";

export default function MovieHeroCarousel({ items }: { items: HeroItem[] }) {
    const [current, setCurrent] = useState(0);
    const heroItems = items.slice(0, 8);

    const next = useCallback(() => {
        setCurrent((prev) => (prev + 1) % heroItems.length);
    }, [heroItems.length]);

    const prev = useCallback(() => {
        setCurrent((prev) => (prev - 1 + heroItems.length) % heroItems.length);
    }, [heroItems.length]);

    useEffect(() => {
        const timer = setInterval(next, 7000);
        return () => clearInterval(timer);
    }, [next]);

    if (!heroItems.length) return null;

    const item = heroItems[current];
    const title = item.title || item.name || "Untitled";
    const year = (item.release_date || item.first_air_date || "").slice(0, 4);
    const matchPercent = Math.round((item.vote_average || 0) * 10);
    const type = item.media_type || "movie";

    return (
        <div className="relative w-full h-[55vh] md:h-[70vh] lg:h-[80vh] overflow-hidden bg-[var(--bg-main)]">
            {/* Background images with crossfade */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={current}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute inset-0"
                >
                    {item.backdrop_path && (
                        <img
                            src={`${IMG_BASE}/original${item.backdrop_path}`}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Multi-layer gradient overlays for cinematic look */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 flex items-end pb-16 md:pb-24">
                <div className="max-w-7xl mx-auto px-4 md:px-6 w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={current}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="max-w-2xl"
                        >
                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-3 tracking-tight leading-tight drop-shadow-2xl">
                                {title}
                            </h1>

                            {/* Meta info */}
                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                                {matchPercent > 0 && (
                                    <span className={`text-sm font-bold ${matchPercent >= 70 ? "text-green-400" : "text-yellow-400"}`}>
                                        {matchPercent}% Match
                                    </span>
                                )}
                                {year && <span className="text-[var(--text-muted)] text-sm">{year}</span>}
                                <span className="flex items-center gap-1 text-yellow-400 text-sm">
                                    <Star className="w-3.5 h-3.5 fill-yellow-400" /> {item.vote_average?.toFixed(1)}
                                </span>
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded tracking-wider border border-blue-500/30">HD</span>
                            </div>

                            {/* Description */}
                            <p className="text-[var(--text-main)] text-sm md:text-base leading-relaxed mb-6 line-clamp-3 max-w-xl drop-shadow-lg">
                                {item.overview}
                            </p>

                            {/* Action buttons */}
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/movies/watch/${type}/${item.id}`}
                                    className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-xl"
                                >
                                    <Play className="w-5 h-5 fill-black" />
                                    Play
                                </Link>
                                <Link
                                    href={`/movies/watch/${type}/${item.id}`}
                                    className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/10"
                                >
                                    <Info className="w-5 h-5" />
                                    More Info
                                </Link>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation arrows */}
            <button
                onClick={prev}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/70 transition-all border border-white/10 opacity-0 hover:opacity-100 focus:opacity-100"
            >
                <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
                onClick={next}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/70 transition-all border border-white/10 opacity-0 hover:opacity-100 focus:opacity-100"
            >
                <ChevronRight className="w-5 h-5 text-white" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {heroItems.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`transition-all duration-300 rounded-full ${i === current
                            ? "w-8 h-2 bg-blue-500 shadow-[0_0_10px_#3b82f6]"
                            : "w-2 h-2 bg-white/30 hover:bg-[var(--bg-card)]0"
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
