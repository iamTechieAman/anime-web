"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from 'swr';
import { Play, ChevronLeft, ChevronRight, Clock, Calendar, Info, Heart, Check, Plus } from "lucide-react";
import axios from "axios";
import { HeroSkeleton } from "@/components/SkeletonLoader";
import { useWatch } from "@/context/WatchContext";

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
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatch();

    const fetcher = (url: string) => axios.get(url).then(res => res.data);

    const { data: trendingData, error } = useSWR('/api/prime/trending', fetcher, {
        refreshInterval: 300000,
        revalidateOnFocus: false,
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

    const processSlides = (rawSlides: any[]) => {
        if (!Array.isArray(rawSlides)) {
            setIsLoading(false);
            return;
        }
        try {
            const formattedSlides: Slide[] = rawSlides.slice(0, 15).map((item: any) => {
                const isTv = item.media_type === 'tv' || !item.title;
                const title = item.title || item.name;
                const description = item.overview || "No description available.";
                const image = item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : '';
                const cover = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';
                const rating = item.vote_average ? `${(item.vote_average * 10).toFixed(0)}%` : "?";
                const release = (item.release_date || item.first_air_date || "2026").split('-')[0];
                const type = isTv ? "TV" : "MOVIE";
                const link = `/watch/${isTv ? 'tv' : 'movie'}/${item.id}`;

                return { id: item.id, title, description, image, cover, tags: ["HD", "Trending"], rating, release, quality: "HD", type, link };
            });

            // Prioritize Michael Jackson's "Michael" (2026) for the theme
            const mjSlideIndex = formattedSlides.findIndex(s => s.id === 936075 || s.title?.toLowerCase().includes("michael"));
            if (mjSlideIndex > -1) {
                const mjSlide = formattedSlides.splice(mjSlideIndex, 1)[0];
                mjSlide.tags = ["BIOPIC", "FEATURED", "PREMIUM"];
                formattedSlides.unshift(mjSlide);
            }

            const validSlides = formattedSlides.filter(s => s && s.image && s.image !== '');
            setSlides(validSlides.length > 0 ? validSlides.slice(0, 12) : []);
        } catch (err) {
            console.error("Error processing slides:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-rotate with pause on interaction (8 seconds)
    const startAutoRotate = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCurrent(prev => (prev + 1) % (slides.length || 1));
        }, 8000);
    }, [slides.length]);

    useEffect(() => {
        if (slides.length === 0) return;
        startAutoRotate();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [slides.length, startAutoRotate]);

    const goToSlide = (index: number) => {
        setCurrent(index);
        startAutoRotate(); // Reset timer on manual navigation
    };

    const nextSlide = () => goToSlide((current + 1) % slides.length);
    const prevSlide = () => goToSlide((current - 1 + slides.length) % slides.length);

    // Swipe gesture handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const minSwipeDistance = 50;

        if (distance > minSwipeDistance) nextSlide();
        if (distance < -minSwipeDistance) prevSlide();

        setTouchStart(0);
        setTouchEnd(0);
    };

    if (isLoading) return <HeroSkeleton />;
    if (slides.length === 0) return (
        <div className="relative w-full h-[42vh] md:h-[60vh] overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#111133] to-[#0a0a1a]">
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Play className="w-7 h-7 text-white/30" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white/60 font-sora">Trending Now</h2>
                    <p className="text-sm text-white/30 mt-1">Loading the latest hits...</p>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-main)] to-transparent" />
        </div>
    );

    const activeSlide = slides[current];
    const slideId = String(activeSlide.id);
    const inWatchlist = isInWatchlist(slideId);

    const toggleWatchlist = () => {
        if (inWatchlist) {
            removeFromWatchlist(slideId);
        } else {
            addToWatchlist({
                id: slideId,
                showId: slideId,
                type: activeSlide.type === "TV" ? "tv" : "movie",
                title: activeSlide.title,
                poster: activeSlide.cover
            });
        }
    };

    return (
        <div 
            className="relative w-full h-[65vh] md:h-[80vh] min-h-[480px] md:min-h-[600px] max-h-[900px] overflow-hidden group bg-[var(--bg-main)]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Background Image — CSS crossfade for 60fps */}
            {slides.map((slide, i) => (
                <div
                    key={slide.id}
                    className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                    style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
                >
                    <div className="absolute inset-0">
                        {/* Desktop Backdrop */}
                        <Image
                            src={slide.image}
                            alt={slide.title}
                            fill
                            priority={i < 2}
                            fetchPriority={i === 0 ? "high" : "low"}
                            className="object-cover object-top opacity-70 hidden md:block"
                            sizes="100vw"
                        />
                        {/* Mobile Cover Poster */}
                        <Image
                            src={slide.cover}
                            alt={slide.title}
                            fill
                            priority={i < 2}
                            fetchPriority={i === 0 ? "high" : "low"}
                            className="object-cover object-top opacity-50 block md:hidden"
                            sizes="100vw"
                        />
                    </div>
                </div>
            ))}

            {/* Symmetrical Vignette & Netflix-style Left Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-main)] via-[var(--bg-main)]/60 to-transparent w-full md:w-[70%] z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-transparent to-[var(--bg-main)]/20 z-10" />
            <div className="absolute bottom-0 left-0 right-0 h-24 md:h-40 bg-gradient-to-t from-[var(--bg-main)] to-transparent z-10" />
            
            {/* Content - Left-Aligned Cinematic Layout */}
            <div className="absolute inset-0 flex flex-col justify-end pb-16 md:pb-28 px-4 md:px-12 z-20 max-w-[1600px] mx-auto w-full md:w-[65%]">
                <div className="flex flex-col items-start text-left gap-3 md:gap-4 w-full">
                    
                    {/* Trending Badge */}
                    <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white text-[9px] md:text-[10px] font-black px-3 py-1 rounded-sm flex items-center gap-1.5 shadow-lg w-max mb-2">
                        TRENDING NOW
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight text-white line-clamp-2 font-sora drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)]">
                        {activeSlide.title}
                    </h1>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-white/90">
                        {activeSlide.rating !== "?" && (
                            <span className="text-green-500 font-bold drop-shadow-md">
                                {activeSlide.rating} Match
                            </span>
                        )}
                        <span className="text-white/70">{activeSlide.release}</span>
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] uppercase border border-white/20">
                            {activeSlide.type}
                        </span>
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] uppercase border border-white/20">
                            {activeSlide.quality}
                        </span>
                    </div>

                    {/* Description */}
                    <p className="text-zinc-300 text-sm md:text-base lg:text-lg leading-relaxed max-w-2xl font-medium drop-shadow-md line-clamp-3 md:line-clamp-4 mt-2">
                        {activeSlide.description}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 md:gap-4 w-full sm:w-auto mt-4">
                        <Link href={activeSlide.link} className="flex-1 sm:flex-none">
                            <button className="w-full flex items-center justify-center gap-2 px-8 py-3 md:py-3.5 bg-white text-black hover:bg-gray-200 font-bold rounded-lg transition-colors shadow-lg active:scale-95">
                                <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                                <span className="text-base md:text-lg">Play</span>
                            </button>
                        </Link>
                        
                        {/* Watchlist Toggle Action */}
                        <button 
                            onClick={toggleWatchlist}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 md:py-3.5 bg-gray-500/30 hover:bg-gray-500/50 backdrop-blur-md text-white font-bold rounded-lg border border-white/10 transition-colors shadow-lg active:scale-95"
                        >
                            {inWatchlist ? (
                                <>
                                    <Check className="w-5 h-5 md:w-6 md:h-6" />
                                    <span className="text-base md:text-lg">Added</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5 md:w-6 md:h-6" />
                                    <span className="text-base md:text-lg">My List</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-6 right-4 md:right-8 flex items-center gap-3 z-30">
                {/* Dot indicators */}
                {/* Arrow buttons */}
                <button
                    onClick={prevSlide}
                    className="p-2.5 md:p-3 bg-black/40 hover:bg-black/60 text-white rounded border border-white/10 transition-colors active:scale-90"
                    aria-label="Previous slide"
                >
                    <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                    onClick={nextSlide}
                    className="p-2.5 md:p-3 bg-black/40 hover:bg-black/60 text-white rounded border border-white/10 transition-colors active:scale-90"
                    aria-label="Next slide"
                >
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                </button>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5 z-30">
                <div 
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500 ease-out" 
                    style={{ width: `${((current + 1) / slides.length) * 100}%` }}
                />
            </div>
        </div>
    );
}
