"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from 'swr';
import { Play, ChevronLeft, ChevronRight, Check, Plus, Volume2, VolumeX, Shuffle } from "lucide-react";
import axios from "axios";
import { HeroSkeleton } from "@/components/SkeletonLoader";
import { useWatch } from "@/context/WatchContext";
import { useUserStore, isKidsFriendly } from "@/store/userStore";

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
    const { profiles, activeProfileId } = useUserStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const isKidsMode = activeProfile?.isKids || false;

    const [current, setCurrent] = useState(0);
    const [slides, setSlides] = useState<Slide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const trailerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatch();

    const fetcher = (url: string) => axios.get(url).then(res => res.data);

    const { data: trendingData, error } = useSWR('/api/prime/trending', fetcher, {
        refreshInterval: 300000,
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

    // Recover user mute preference on mount
    useEffect(() => {
        const storedMute = localStorage.getItem('toonplayer_hero_muted');
        if (storedMute !== null) {
            setIsMuted(storedMute === 'true');
        }
    }, []);

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
            const filteredSlides = isKidsMode ? rawSlides.filter(s => isKidsFriendly(s)) : rawSlides;
            const formattedSlides: Slide[] = filteredSlides.slice(0, 15).map((item: any) => {
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

            // Prioritize Michael Jackson's biopic if present
            const mjSlideIndex = formattedSlides.findIndex(s => s.id === 936075 || s.title?.toLowerCase().includes("michael"));
            if (mjSlideIndex > -1) {
                const mjSlide = formattedSlides.splice(mjSlideIndex, 1)[0];
                mjSlide.tags = ["BIOPIC", "FEATURED", "PREMIUM"];
                formattedSlides.unshift(mjSlide);
            }

            const validSlides = formattedSlides.filter(s => s && s.image && s.image !== '');
            const slicedSlides = validSlides.length > 0 ? validSlides.slice(0, 12) : [];
            // Shuffle to keep the homepage fresh (random hero)
            const shuffledSlides = [...slicedSlides].sort(() => Math.random() - 0.5);
            setSlides(shuffledSlides);
        } catch (err) {
            console.error("Error processing slides:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Autoplay rotation
    const startAutoRotate = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCurrent(prev => (prev + 1) % (slides.length || 1));
        }, 8000);
    }, [slides.length]);

    useEffect(() => {
        if (slides.length === 0) return;
        if (activeTrailerKey) {
            // Pause auto-rotation when trailer is playing
            if (timerRef.current) clearInterval(timerRef.current);
        } else {
            startAutoRotate();
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [slides.length, activeTrailerKey, startAutoRotate]);

    // Handle trailer preview on slide change
    useEffect(() => {
        if (slides.length === 0) return;
        setActiveTrailerKey(null);
        if (trailerTimeoutRef.current) clearTimeout(trailerTimeoutRef.current);

        const activeSlide = slides[current];
        
        // Start trailer fetch after 3 seconds of standing on a slide
        trailerTimeoutRef.current = setTimeout(async () => {
            try {
                const typeHint = activeSlide.type === "TV" ? "tv" : "movie";
                const res = await axios.get(`/api/prime/details?id=${activeSlide.id}&type=${typeHint}`);
                if (res.data?.trailer?.key) {
                    setActiveTrailerKey(res.data.trailer.key);
                }
            } catch (err) {
                console.log("No trailer found for active slide");
            }
        }, 3000);

        return () => {
            if (trailerTimeoutRef.current) clearTimeout(trailerTimeoutRef.current);
        };
    }, [current, slides]);

    const goToSlide = (index: number) => {
        setCurrent(index);
        startAutoRotate();
    };

    const nextSlide = () => goToSlide((current + 1) % slides.length);
    const prevSlide = () => goToSlide((current - 1 + slides.length) % slides.length);

    // Swipe handlers
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

    const toggleMute = () => {
        const nextMute = !isMuted;
        setIsMuted(nextMute);
        localStorage.setItem('toonplayer_hero_muted', String(nextMute));
        if (iframeRef.current) {
            const command = nextMute ? '{"event":"command","func":"mute","args":[]}' : '{"event":"command","func":"unMute","args":[]}';
            iframeRef.current.contentWindow?.postMessage(command, '*');
        }
    };

    if (isLoading) return <HeroSkeleton />;
    if (slides.length === 0) return (
        <div className="relative w-full h-[40vh] md:h-[60vh] overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#111133] to-[#0a0a1a]">
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-6">
                    <h2 className="text-xl md:text-2xl font-black text-white/60 font-sora">Trending Now</h2>
                    <p className="text-sm text-white/30 mt-1">Loading the latest hits...</p>
                </div>
            </div>
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
            className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] min-h-[340px] sm:min-h-[420px] md:min-h-[480px] max-h-[70vh] overflow-hidden group bg-[var(--bg-main)]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Background Images / YouTube Video Trailer */}
            {slides.map((slide, i) => {
                const isActive = i === current;
                return (
                    <div
                        key={slide.id}
                        className="absolute inset-0 transition-opacity duration-[250ms] ease-apple-out"
                        style={{ opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : 0 }}
                    >
                        {isActive && activeTrailerKey ? (
                            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                                <iframe
                                    ref={iframeRef}
                                    src={`https://www.youtube.com/embed/${activeTrailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${activeTrailerKey}&showinfo=0&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1`}
                                    title="Hero Trailer"
                                    className="absolute top-1/2 left-1/2 w-[300vw] h-[300vh] sm:w-[200vw] sm:h-[200vh] lg:w-[150vw] lg:h-[150vh] -translate-x-1/2 -translate-y-1/2 border-0"
                                    allow="autoplay; encrypted-media"
                                />
                            </div>
                        ) : (
                            <div className="absolute inset-0">
                                {/* Desktop Backdrop */}
                                <Image
                                    src={slide.image}
                                    alt={slide.title}
                                    fill
                                    priority={i < 2}
                                    className="object-cover object-top opacity-70 hidden md:block"
                                    sizes="100vw"
                                />
                                {/* Mobile Cover Poster */}
                                <Image
                                    src={slide.cover}
                                    alt={slide.title}
                                    fill
                                    priority={i < 2}
                                    className="object-cover object-top opacity-50 block md:hidden"
                                    sizes="100vw"
                                />
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-y-0 left-0 w-full md:w-[60%] bg-gradient-to-r from-[var(--bg-main)] via-[var(--bg-main)]/90 via-[var(--bg-main)]/50 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-transparent to-black/35 z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-28 md:h-44 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/70 to-transparent z-10 pointer-events-none" />
            
            {/* Left Content Area */}
            <div className="absolute inset-0 flex flex-col justify-end pb-12 md:pb-20 px-4 md:px-12 z-20 max-w-[1600px] mx-auto w-full md:w-[65%] pointer-events-none">
                <div className="flex flex-col items-start text-left gap-3 md:gap-4 w-full pointer-events-auto">
                    
                    {/* Trending Badge */}
                    <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white text-[9px] md:text-[10px] font-black px-3 py-1 rounded-sm flex items-center gap-1.5 shadow-lg w-max mb-1 select-none">
                        TRENDING NOW
                    </div>

                    {/* Title */}
                    <h1 
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-white line-clamp-2 font-sora"
                        style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8), 0 4px 30px rgba(0,0,0,0.9)" }}
                    >
                        {activeSlide.title}
                    </h1>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-white/90" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                        {activeSlide.rating !== "?" && (
                            <span className="text-green-400 font-extrabold">
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
                    <p 
                        className="text-zinc-300 text-xs md:text-sm lg:text-base leading-relaxed max-w-2xl font-semibold line-clamp-3 md:line-clamp-4 mt-1"
                        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}
                    >
                        {activeSlide.description}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 md:gap-4 w-full sm:w-auto mt-3">
                        <Link href={activeSlide.link} className="flex-1 sm:flex-none">
                            <button className="w-full flex items-center justify-center gap-2 px-8 py-2 md:py-2.5 bg-white text-black hover:bg-zinc-200 font-bold rounded-md transition-colors shadow-lg active:scale-95">
                                <Play className="w-4 h-4 md:w-5 h-5 fill-current" />
                                <span className="text-sm md:text-base">Play</span>
                            </button>
                        </Link>
                        
                        <button 
                            onClick={toggleWatchlist}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 md:py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-md border border-white/10 transition-colors shadow-lg active:scale-95"
                        >
                            {inWatchlist ? <Check className="w-4 h-4 md:w-5 h-5" /> : <Plus className="w-4 h-4 md:w-5 h-5" />}
                            <span className="text-sm md:text-base">{inWatchlist ? "Added" : "My List"}</span>
                        </button>

                        <button 
                            onClick={() => {
                                if (typeof window !== "undefined") {
                                    window.dispatchEvent(new Event("openRandomizer"));
                                }
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 md:py-2.5 bg-pink-600/80 hover:bg-pink-600 border border-pink-500/20 text-white font-bold rounded-md transition-colors shadow-lg active:scale-95"
                        >
                            <Shuffle className="w-4 h-4 md:w-5 h-5" />
                            <span className="text-sm md:text-base">Surprise Me</span>
                        </button>

                        {/* Mute Button Toggle */}
                        {activeTrailerKey && (
                            <button 
                                onClick={toggleMute}
                                className="w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-white transition-colors active:scale-90"
                                title={isMuted ? "Unmute Trailer" : "Mute Trailer"}
                            >
                                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation & Audio Controls Right-bottom */}
            <div className="absolute bottom-6 right-4 md:right-8 flex items-center gap-3 z-30">
                <button
                    onClick={prevSlide}
                    className="p-2 bg-black/40 hover:bg-black/60 text-white rounded border border-white/10 transition-colors active:scale-90"
                    aria-label="Previous slide"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={nextSlide}
                    className="p-2 bg-black/40 hover:bg-black/60 text-white rounded border border-white/10 transition-colors active:scale-90"
                    aria-label="Next slide"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Slide progress row */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5 z-30">
                <div 
                    className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] transition-all duration-[250ms] ease-apple" 
                    style={{ width: `${((current + 1) / slides.length) * 100}%` }}
                />
            </div>
        </div>
    );
}
