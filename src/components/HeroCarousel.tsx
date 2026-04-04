"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import useSWR from 'swr';
import { Play, ChevronLeft, ChevronRight, Clock, Calendar } from "lucide-react";
import axios from "axios";

interface Slide {
    id: number | string;
    title: string;
    description: string;
    image: string;
    cover: string;
    tags: string[];
    rating: string;
    release: string;
    quality: string;
    type: string;
    link: string;
}

export default function HeroCarousel() {
    const [current, setCurrent] = useState(0);
    const [slides, setSlides] = useState<Slide[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Use SWR for real-time updates and auto-revalidation
    const fetcher = (url: string) => axios.get(url).then(res => res.data);

    // Increase refresh interval to 5min — prevents excessive API calls
    const { data: trendingData, error, isLoading: isSwrLoading } = useSWR('/api/prime/trending', fetcher, {
        refreshInterval: 300000,
        revalidateOnFocus: false, // Prevents API burst on tab switch
        dedupingInterval: 60000,
    });

    useEffect(() => {
        if (trendingData?.results) {
            processSlides(trendingData.results);
        } else if (error) {
            console.error("Failed to fetch home slides:", error);
            setIsLoading(false);
        }
    }, [trendingData, error]);

    const normalizeUrl = (url: string | null | undefined): string => {
        if (!url) return '';
        if (url.startsWith('//')) return `https:${url}`;
        if (url.startsWith('/')) return `https://hianime.to${url}`; // Fallback for relative hianime paths
        return url;
    };

    const processSlides = async (rawSlides: any[]) => {
        console.log("[HeroCarousel] Processing slides from TMDB...");
        try {
            const formattedSlides: Slide[] = rawSlides.slice(0, 15).map((item: any) => {
                const isTv = item.media_type === 'tv' || !item.title;
                const title = item.title || item.name;
                const description = item.overview || "No description.";
                const image = item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : '';
                const cover = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';
                const rating = item.vote_average ? `${(item.vote_average * 10).toFixed(0)}%` : "?";
                const release = (item.release_date || item.first_air_date || "2026").split('-')[0];
                const type = isTv ? "TV" : "MOVIE";
                const link = `/watch/${isTv ? 'tv' : 'movie'}/${item.id}`;

                return {
                    id: item.id,
                    title,
                    description,
                    image,
                    cover,
                    tags: ["HD", "Trending"],
                    rating,
                    release,
                    quality: "HD",
                    type,
                    link
                };
            });

            const validSlides = formattedSlides.filter(s => s.image && s.image !== '');
            if (validSlides.length > 0) {
                setSlides(validSlides);
            } else {
                setSlides(formattedSlides);
            }
        } catch (err) {
            console.error("Error processing slides:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-rotate
    useEffect(() => {
        if (slides.length === 0) return;
        const timer = setInterval(() => {
            nextSlide();
        }, 5000); // Snappier auto-play (was 8000)
        return () => clearInterval(timer);
    }, [current, slides.length]);

    const nextSlide = () => {
        setCurrent((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
    };

    if (isLoading) {
        return (
            <div className="relative w-full h-[50vh] sm:h-[55vh] md:h-[60vh] lg:h-[65vh] max-h-[700px] bg-[var(--bg-main)] flex items-center justify-center border-b border-[var(--border-color)]">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (slides.length === 0) return null;

    const activeSlide = slides[current];

    return (
        <div className="relative w-full h-[50vh] sm:h-[55vh] md:h-[60vh] lg:h-[65vh] max-h-[700px] overflow-hidden group bg-black">
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={activeSlide.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0"
                >
                    {/* Background Image (optimized) */}
                    <div className="absolute inset-0 overflow-hidden bg-black">
                        <div className="absolute inset-0">
                            <Image
                                src={activeSlide.image}
                                alt={activeSlide.title}
                                fill
                                priority
                                fetchPriority="high"
                                className="object-cover object-center opacity-70"
                                sizes="(max-width: 768px) 100vw, 100vw"
                            />
                        </div>
                        
                        {/* Premium Vignette & Gradients - justanime.to style */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/30 z-10" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent z-10" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#0a0a0a_100%)] opacity-40 z-10" />
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Countdown Badge (Top Left) */}
            <div className="absolute top-24 left-4 md:left-24 z-30">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-purple-600 border border-purple-500/50 text-white text-[10px] md:text-xs font-black px-3 py-1.5 rounded-sm shadow-xl flex items-center gap-2"
                >
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    TRENDING SELECTION
                </motion.div>
            </div>

            {/* Slide Index (Top Right) */}
            <div className="absolute top-24 right-4 md:right-8 z-30 font-bold text-xs md:text-sm text-white/50">
                <span className="text-white">{current + 1}</span> / {slides.length}
            </div>

            {/* Content Container */}
            <div className="absolute inset-0 flex items-center z-20">
                <div className="w-full max-w-[2400px] mx-auto px-6 md:px-12 w-full pt-20 md:pt-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSlide.id + "-content"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="max-w-2xl"
                        >
                            {/* Metadata Badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="bg-[#FF5722] text-white px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider">
                                    {activeSlide.type}
                                </span>
                                <span className="bg-black/40 text-white px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border border-white/10">
                                    {activeSlide.quality}
                                </span>
                                <span className="text-xs font-bold text-white/70 flex items-center gap-1 ml-1">
                                    <Clock className="w-3.5 h-3.5" /> 24m
                                </span>
                                <span className="text-xs font-bold text-white/70 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" /> {activeSlide.release}
                                </span>
                            </div>

                            {/* Title - Stagger 2 */}
                            <motion.h1
                                initial={{ y: 12, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.05 }}
                                className="text-4xl md:text-6xl font-black leading-tight text-white mb-4 line-clamp-2 font-sora tracking-tighter"
                            >
                                {activeSlide.title}
                            </motion.h1>

                            {/* Description - Stagger 3 */}
                            <motion.p
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                                className="text-white/70 text-sm md:text-base line-clamp-2 md:line-clamp-3 leading-relaxed max-w-xl mb-8 font-medium"
                            >
                                {activeSlide.description}
                            </motion.p>

                            {/* Action Buttons - Stagger 4 */}
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.25, delay: 0.15 }}
                                className="flex items-center gap-3 md:gap-4"
                            >
                                <Link href={activeSlide.link}>
                                    <button className="flex items-center gap-2.5 px-8 md:px-10 py-3.5 md:py-4 bg-white text-black hover:bg-white/90 font-black rounded-sm transition-colors active:scale-95 group/btn shadow-[0_4px_20px_rgba(255,255,255,0.1)]">
                                        <Play className="w-5 h-5 fill-current" />
                                        WATCH NOW
                                    </button>
                                </Link>
                                <button className="flex items-center gap-2.5 px-6 py-3.5 md:py-4 bg-black/40 hover:bg-black/60 text-white font-bold rounded-sm border border-white/10 transition-colors group/details">
                                    Details <ChevronRight className="w-4 h-4 transition-transform group-hover/details:translate-x-1" />
                                </button>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <div className="absolute bottom-10 right-4 md:right-8 flex items-center gap-2 z-30">
                <button
                    onClick={prevSlide}
                    className="p-3 md:p-4 bg-black/40 hover:bg-black/60 text-white rounded-sm border border-white/10 transition-colors active:scale-90"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={nextSlide}
                    className="p-3 md:p-4 bg-black/40 hover:bg-black/60 text-white rounded-sm border border-white/10 transition-colors active:scale-90"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Bottom Accent Line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30">
                <motion.div 
                    className="h-full bg-[#FF5722]" 
                    initial={{ width: "0%" }}
                    animate={{ width: `${((current + 1) / slides.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>
        </div>
    );
}
