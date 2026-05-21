"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from 'swr';
import { Play, ChevronLeft, ChevronRight, Clock, Calendar, Info } from "lucide-react";
import axios from "axios";
import { HeroSkeleton } from "@/components/SkeletonLoader";

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

    // Auto-rotate with pause on interaction
    const startAutoRotate = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCurrent(prev => (prev + 1) % (slides.length || 1));
        }, 6000);
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
        <div className="relative w-full h-[35vh] md:h-[45vh] overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#111133] to-[#0a0a1a]">
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

    return (
        <div 
            className="relative w-full xl:max-w-[1600px] xl:mx-auto xl:rounded-[22px] xl:border xl:border-white/[0.07] xl:my-3 h-[38vh] sm:h-[42vh] md:h-[46vh] lg:h-[50vh] max-h-[480px] overflow-hidden group bg-black shadow-2xl"
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
                            className="object-cover object-center opacity-70 hidden md:block"
                            sizes="100vw"
                        />
                        {/* Mobile Cover Poster */}
                        <Image
                            src={slide.cover}
                            alt={slide.title}
                            fill
                            priority={i < 2}
                            fetchPriority={i === 0 ? "high" : "low"}
                            className="object-cover object-center opacity-40 block md:hidden"
                            sizes="100vw"
                        />
                    </div>
                </div>
            ))}

            {/* Vignette & Gradient overlays */}
            <div className="hero-vignette" />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-main)] via-[var(--bg-main)]/50 to-transparent z-10" />

            {/* Trending Badge */}
            <div className="absolute top-14 left-4 md:left-20 z-30">
                <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white text-[9px] md:text-[10px] font-black px-2.5 py-1 rounded flex items-center gap-1.5 shadow-lg animate-fadeSlideDown">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    TRENDING NOW
                </div>
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex items-end z-20 pb-10 md:pb-14">
                <div className="w-full px-5 md:px-10">
                    <div className="max-w-xl">
                        {/* Metadata Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                                {activeSlide.type}
                            </span>
                            <span className="bg-white/10 text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase border border-white/10">
                                {activeSlide.quality}
                            </span>
                            <span className="text-[10px] font-bold text-white/60 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {activeSlide.release}
                            </span>
                            {activeSlide.rating !== "?" && (
                                <span className="text-[10px] font-bold text-green-400">
                                    {activeSlide.rating} Match
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-[1.05] text-white mb-2 line-clamp-2 font-sora tracking-tighter drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
                            {activeSlide.title}
                        </h1>

                        {/* Description */}
                        <p className="text-white/75 text-xs md:text-sm line-clamp-2 leading-relaxed max-w-lg mb-5 font-medium drop-shadow-md hidden sm:block">
                            {activeSlide.description}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2.5">
                            <Link href={activeSlide.link}>
                                <button className="flex items-center gap-2 px-6 md:px-8 py-2.5 bg-white text-black hover:bg-white/90 font-black rounded transition-all active:scale-95 shadow-[0_4px_20px_rgba(255,255,255,0.12)] text-sm">
                                    <Play className="w-4 h-4 fill-current" />
                                    PLAY
                                </button>
                            </Link>
                            <Link href={activeSlide.link}>
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded border border-white/10 transition-all text-sm">
                                    <Info className="w-4 h-4" />
                                    More Info
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-6 right-4 md:right-8 flex items-center gap-3 z-30">
                {/* Dot indicators */}
                <div className="hero-dots hidden md:flex">
                    {slides.slice(0, 8).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goToSlide(i)}
                            className={`hero-dot relative overflow-hidden transition-all duration-300 ${i === current ? '!w-12 !bg-white/20' : ''}`}
                            aria-label={`Go to slide ${i + 1}`}
                        >
                            {i === current && (
                                <div className="absolute top-0 left-0 bottom-0 bg-white animate-[progressBar_6s_linear]" />
                            )}
                        </button>
                    ))}
                </div>

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
