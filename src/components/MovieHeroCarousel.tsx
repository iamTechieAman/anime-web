"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Play, Info, Star, ChevronLeft, ChevronRight, Shuffle } from "lucide-react";

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

    if (!heroItems.length) {
        return (
            <div className="relative w-full h-[55vh] md:h-[70vh] min-h-[420px] md:min-h-[550px] max-h-[70vh] pb-12 md:pb-16 bg-bg-main">
                <div className="absolute inset-0 bg-gradient-to-t from-bg-main to-transparent" />
                <div className="absolute bottom-10 md:bottom-16 left-0 right-0 max-w-[1800px] mx-auto px-4 md:px-6 w-full space-y-4">
                    <div className="h-10 md:h-14 w-[60%] bg-bg-card rounded-xl animate-pulse" />
                    <div className="flex gap-3">
                        <div className="h-5 w-20 bg-bg-card rounded-md animate-pulse" />
                        <div className="h-5 w-16 bg-bg-card rounded-md animate-pulse" />
                        <div className="h-5 w-12 bg-bg-card rounded-md animate-pulse" />
                    </div>
                    <div className="h-16 w-[80%] max-w-xl bg-bg-card rounded-lg animate-pulse" />
                    <div className="flex gap-3 pt-2">
                        <div className="h-12 w-28 bg-bg-card rounded-xl animate-pulse" />
                        <div className="h-12 w-32 bg-bg-card rounded-xl animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    const item = heroItems[current];
    const title = item.title || item.name || "Untitled";
    const year = (item.release_date || item.first_air_date || "").slice(0, 4);
    const matchPercent = Math.round((item.vote_average || 0) * 10);
    const type = item.media_type || "movie";

    return (
        <div className="relative w-full h-[55vh] md:h-[70vh] min-h-[420px] md:min-h-[550px] max-h-[70vh] pb-12 md:pb-16 overflow-hidden bg-bg-main">
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
                        <Image
                            src={`${IMG_BASE}/original${item.backdrop_path}`}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-[10000ms] ease-linear hover:scale-110" will-change-transform
                            priority={current === 0}
                            sizes="100vw"
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Multi-layer gradient overlays for cinematic look */}
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.85)_100%)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/45 to-transparent w-full" />
            <div className="absolute bottom-0 left-0 right-0 h-32 md:h-44 bg-gradient-to-t from-bg-main via-bg-main/80 to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 flex items-center justify-center pb-8 md:pb-12 z-20 pt-16">
                <div className="w-full max-w-3xl mx-auto px-4 md:px-6 flex flex-col items-center justify-center text-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={current}
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="flex flex-col items-center justify-center text-center gap-4"
                        >
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[1.05] drop-shadow-[0_4px_25px_rgba(0,0,0,0.95)]">
                                {title}
                            </h1>

                            {/* Meta info */}
                            <div className="flex items-center justify-center gap-4 flex-wrap mt-1">
                                {matchPercent > 0 && (
                                    <span className={`text-base font-bold ${matchPercent >= 70 ? "text-green-400" : "text-yellow-400"}`}>
                                        {matchPercent}% Match
                                    </span>
                                )}
                                {year && <span className="text-[var(--text-muted)] text-base font-medium">{year}</span>}
                                <span className="flex items-center gap-1.5 text-yellow-400 text-base font-bold">
                                    <Star className="w-4 h-4 fill-yellow-400" /> {item.vote_average?.toFixed(1)}
                                </span>
                                <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-bold rounded shadow-sm backdrop-blur-sm tracking-widest border border-white/20">HD</span>
                            </div>

                            {/* Description */}
                            <p className="text-[#d1d5db] text-sm md:text-base leading-relaxed line-clamp-3 md:line-clamp-4 max-w-xl drop-shadow-md">
                                {item.overview}
                            </p>

                            {/* Action buttons */}
                            <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
                                <Link
                                    href={`/watch/${type}/${item.id}`}
                                    scroll={false}
                                    className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-black font-extrabold text-base rounded-xl hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.3)]"
                                >
                                    <Play className="w-6 h-6 fill-black" />
                                    Play Now
                                </Link>
                                <Link
                                    href={`/watch/${type}/${item.id}`}
                                    scroll={false}
                                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 backdrop-blur-md text-white font-bold text-base rounded-xl hover:bg-white/20 transition-colors border border-white/20 shadow-xl hover:scale-105 active:scale-95"
                                >
                                    <Info className="w-6 h-6" />
                                    More Info
                                </Link>
                                <button
                                    onClick={() => {
                                        if (typeof window !== "undefined") {
                                            window.dispatchEvent(new Event("openRandomizer"));
                                        }
                                    }}
                                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-pink-600/80 hover:bg-pink-600 border border-pink-500/20 text-white font-bold text-base rounded-xl transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    <Shuffle className="w-5 h-5" />
                                    Surprise Me
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <button
                onClick={prev}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full hover:bg-black/70 transition-colors border border-white/10 opacity-0 hover:opacity-100 focus:opacity-100"
            >
                <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
                onClick={next}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full hover:bg-black/70 transition-colors border border-white/10 opacity-0 hover:opacity-100 focus:opacity-100"
            >
                <ChevronRight className="w-5 h-5 text-white" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {heroItems.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`transition-all duration-[250ms] rounded-full ${i === current
                            ? "w-8 h-2 bg-accent-warm shadow-glow-warm"
                            : "w-2 h-2 bg-white/30 hover:bg-white/50"
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
