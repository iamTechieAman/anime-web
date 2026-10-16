"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { Play, ChevronLeft, ChevronRight, Check, Plus, Volume2, VolumeX, Shuffle, Info, Sparkles, Star } from "lucide-react";
import axios from "axios";
import { useWatch } from "@/context/WatchContext";
import { useUserStore, isKidsFriendly } from "@/store/userStore";
import { detectMediaType } from "@/utils/mediaType";

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

// Built-in curated fallback slides to guarantee the hero is never an empty black box
const DEFAULT_HERO_SLIDES: Slide[] = [
    {
        id: "693134",
        title: "Dune: Part Two",
        description: "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
        image: "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg",
        cover: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
        tags: ["4K UHD", "SCI-FI", "SPECTACLE"],
        rating: "86%",
        release: "2024",
        quality: "4K UHD",
        type: "MOVIE",
        link: "/watch/movie/693134"
    },
    {
        id: "533535",
        title: "Deadpool & Wolverine",
        description: "A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again.",
        image: "https://image.tmdb.org/t/p/original/yDHYTjA3R0ne82juh4W90uVbF.jpg",
        cover: "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
        tags: ["4K UHD", "ACTION", "COMEDY"],
        rating: "78%",
        release: "2024",
        quality: "4K UHD",
        type: "MOVIE",
        link: "/watch/movie/533535"
    },
    {
        id: "94605",
        title: "Arcane: League of Legends",
        description: "Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and incompatible convictions.",
        image: "https://image.tmdb.org/t/p/original/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg",
        cover: "https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
        tags: ["PREMIUM", "ANIMATION", "MASTERPIECE"],
        rating: "91%",
        release: "2024",
        quality: "4K UHD",
        type: "TV",
        link: "/watch/tv/94605"
    },
    {
        id: "85937",
        title: "Demon Slayer: Kimetsu no Yaiba",
        description: "Tanjiro Kamado, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon. To make matters worse, his younger sister Nezuko has been transformed into a demon.",
        image: "https://image.tmdb.org/t/p/original/nTvM4mhqZlHIvUkIvdUdUR6nR2L.jpg",
        cover: "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
        tags: ["ANIME", "ACTION", "POPULAR"],
        rating: "87%",
        release: "2024",
        quality: "HD",
        type: "ANIME",
        link: "/watch/anime/85937"
    },
    {
        id: "105",
        title: "Back to the Future",
        description: "Eighties teenager Marty McFly is accidentally sent back in time to 1955 in a plutonium-powered DeLorean 'time machine' invented by eccentric scientist Doc Brown.",
        image: "https://image.tmdb.org/t/p/original/58wfX9v1iOcxX1s3r8n9V9Q4V3y.jpg",
        cover: "https://image.tmdb.org/t/p/w500/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg",
        tags: ["CLASSIC", "SCI-FI", "TOP RATED"],
        rating: "83%",
        release: "1985",
        quality: "4K UHD",
        type: "MOVIE",
        link: "/watch/movie/105"
    }
];

export default function HeroCarousel() {
    const { profiles, activeProfileId } = useUserStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const isKidsMode = activeProfile?.isKids || false;

    const [current, setCurrent] = useState(0);
    const [slides, setSlides] = useState<Slide[]>(DEFAULT_HERO_SLIDES);
    const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const trailerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatch();

    const fetcher = (url: string) => axios.get(url).then(res => res.data);

    const { data: trendingData, error } = useSWR("/api/prime/trending", fetcher, {
        refreshInterval: 300000,
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

    // Check user preferences on mount (mute & reduced-motion)
    useEffect(() => {
        const storedMute = localStorage.getItem("toonplayer_hero_muted");
        if (storedMute !== null) {
            setIsMuted(storedMute === "true");
        }
        if (typeof window !== "undefined") {
            const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
            setPrefersReducedMotion(motionQuery.matches);
            const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
            motionQuery.addEventListener("change", handleChange);
            return () => motionQuery.removeEventListener("change", handleChange);
        }
    }, []);

    const processSlides = useCallback((rawSlides: any[]) => {
        if (!Array.isArray(rawSlides) || rawSlides.length === 0) return;
        try {
            const filteredSlides = isKidsMode ? rawSlides.filter(s => s && isKidsFriendly(s)) : rawSlides;
            const formattedSlides: Slide[] = filteredSlides.slice(0, 15).map((item: any) => {
                const mediaType = detectMediaType(item);
                const isTv = mediaType === "tv";
                const isAnime = mediaType === "anime";
                const title = item.title || item.name;
                const description = item.overview || "Stream this title in high definition on ToonPlayer.";
                const image = item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : (item.poster_path ? `https://image.tmdb.org/t/p/w1280${item.poster_path}` : "");
                const cover = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : image;
                const rating = item.vote_average ? `${(item.vote_average * 10).toFixed(0)}%` : "85%";
                const release = (item.release_date || item.first_air_date || "2025").split("-")[0];
                const type = isAnime ? "ANIME" : isTv ? "SERIES" : "MOVIE";
                const link = isAnime ? `/watch/anime/${item.id}` : `/watch/${mediaType}/${item.id}`;

                return {
                    id: item.id,
                    title,
                    description,
                    image,
                    cover,
                    tags: [type, "HD", "TRENDING"],
                    rating,
                    release,
                    quality: item.vote_average > 7.5 ? "4K UHD" : "HD",
                    type,
                    link
                };
            });

            const validSlides = formattedSlides.filter(s => s && s.image && s.image !== "");
            if (validSlides.length > 0) {
                setSlides(validSlides.slice(0, 10));
            }
        } catch (err) {
            console.error("[HeroCarousel] Error processing slides:", err);
        }
    }, [isKidsMode]);

    // Process fetched trending slides
    useEffect(() => {
        if (trendingData?.results && Array.isArray(trendingData.results)) {
            processSlides(trendingData.results);
        } else if (error) {
            console.warn("[HeroCarousel] Trending API error, using curated fallback slides");
        }
    }, [trendingData, error, processSlides]);

    // Autoplay rotation (paused if reduced-motion is requested or trailer is active)
    const startAutoRotate = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (prefersReducedMotion) return;
        timerRef.current = setInterval(() => {
            setCurrent(prev => (prev + 1) % (slides.length || 1));
        }, 7000);
    }, [slides.length, prefersReducedMotion]);

    const goToSlide = useCallback((index: number) => {
        setCurrent(index);
        startAutoRotate();
    }, [startAutoRotate]);

    const nextSlide = useCallback(() => {
        goToSlide((current + 1) % (slides.length || 1));
    }, [current, slides.length, goToSlide]);

    const prevSlide = useCallback(() => {
        goToSlide((current - 1 + (slides.length || 1)) % (slides.length || 1));
    }, [current, slides.length, goToSlide]);

    useEffect(() => {
        if (slides.length === 0) return;
        if (activeTrailerKey || prefersReducedMotion) {
            if (timerRef.current) clearInterval(timerRef.current);
        } else {
            startAutoRotate();
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [slides.length, activeTrailerKey, prefersReducedMotion, startAutoRotate]);

    // Keyboard navigation (ArrowLeft & ArrowRight)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === "ArrowLeft") {
                prevSlide();
            } else if (e.key === "ArrowRight") {
                nextSlide();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [prevSlide, nextSlide]);

    // Handle trailer preview on slide change
    useEffect(() => {
        if (slides.length === 0) return;
        setActiveTrailerKey(null);
        if (trailerTimeoutRef.current) clearTimeout(trailerTimeoutRef.current);

        const activeSlide = slides[current];
        if (!activeSlide) return;

        trailerTimeoutRef.current = setTimeout(async () => {
            try {
                const typeHint = activeSlide.type === "SERIES" || activeSlide.type === "TV" ? "tv" : "movie";
                const res = await axios.get(`/api/prime/details?id=${activeSlide.id}&type=${typeHint}`);
                if (res.data?.trailer?.key) {
                    setActiveTrailerKey(res.data.trailer.key);
                }
            } catch {
                // Silently fallback to backdrop image
            }
        }, 3500);

        return () => {
            if (trailerTimeoutRef.current) clearTimeout(trailerTimeoutRef.current);
        };
    }, [current, slides]);

    // Swipe handlers for touch screens
    const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
    const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        if (distance > 50) nextSlide();
        if (distance < -50) prevSlide();
        setTouchStart(0);
        setTouchEnd(0);
    };

    const toggleMute = () => {
        const nextMute = !isMuted;
        setIsMuted(nextMute);
        localStorage.setItem("toonplayer_hero_muted", String(nextMute));
        if (iframeRef.current) {
            const command = nextMute ? '{"event":"command","func":"mute","args":[]}' : '{"event":"command","func":"unMute","args":[]}';
            iframeRef.current.contentWindow?.postMessage(command, "*");
        }
    };

    const activeSlide = slides[current] || DEFAULT_HERO_SLIDES[0];
    const slideId = String(activeSlide.id);
    const inWatchlist = isInWatchlist(slideId);

    const toggleWatchlist = () => {
        if (inWatchlist) {
            removeFromWatchlist(slideId);
        } else {
            addToWatchlist({
                id: slideId,
                showId: slideId,
                type: activeSlide.type === "SERIES" || activeSlide.type === "TV" ? "tv" : "movie",
                title: activeSlide.title,
                poster: activeSlide.cover
            });
        }
    };

    return (
        <section
            aria-label="Featured cinematic spotlight"
            className="relative w-full h-[62vh] sm:h-[68vh] md:h-[76vh] min-h-[460px] sm:min-h-[520px] md:min-h-[580px] max-h-[820px] overflow-hidden group bg-bg-main select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Background Images / YouTube Video Trailer */}
            {slides.map((slide, i) => {
                const isActive = i === current;
                return (
                    <div
                        key={`${slide.id}-${i}`}
                        className={`absolute inset-0 transition-opacity ${
                            prefersReducedMotion ? "duration-0" : "duration-700"
                        } ease-apple-out`}
                        style={{
                            opacity: isActive ? 1 : 0,
                            zIndex: isActive ? 1 : 0,
                            visibility: isActive ? "visible" : "hidden"
                        }}
                    >
                        {isActive && activeTrailerKey ? (
                            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                                <iframe
                                    ref={iframeRef}
                                    src={`https://www.youtube.com/embed/${activeTrailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${activeTrailerKey}&showinfo=0&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1`}
                                    title="Hero Spotlight Trailer"
                                    className="absolute top-1/2 left-1/2 w-[300vw] h-[300vh] sm:w-[200vw] sm:h-[200vh] lg:w-[150vw] lg:h-[150vh] -translate-x-1/2 -translate-y-1/2 border-0"
                                    allow="autoplay; encrypted-media"
                                />
                            </div>
                        ) : (
                            <div className="absolute inset-0 bg-[#0d0d12]">
                                {/* Desktop Backdrop */}
                                {slide.image ? (
                                    <Image
                                        src={slide.image}
                                        alt={slide.title}
                                        fill
                                        priority={i === current || i === 0}
                                        className="object-cover object-center lg:object-[center_20%] opacity-85 hidden sm:block"
                                        sizes="100vw"
                                    />
                                ) : null}
                                {/* Mobile Cover Poster / Backdrop */}
                                <Image
                                    src={slide.cover || slide.image}
                                    alt={slide.title}
                                    fill
                                    priority={i === current || i === 0}
                                    className="object-cover object-center opacity-65 block sm:hidden"
                                    sizes="100vw"
                                />
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Cinematic Gradient Overlays — keeps text clear while leaving artwork visible on right */}
            <div className="absolute inset-y-0 left-0 w-full sm:w-[75%] md:w-[60%] lg:w-[52%] bg-gradient-to-r from-bg-main via-bg-main/90 via-bg-main/50 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 via-black/20 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-40 md:h-56 bg-gradient-to-t from-bg-main via-bg-main/80 to-transparent z-10 pointer-events-none" />

            {/* Left Content Area */}
            <div className="absolute inset-0 flex flex-col justify-end pb-12 sm:pb-14 md:pb-16 px-4 sm:px-6 md:px-12 z-20 max-w-[1800px] mx-auto w-full pointer-events-none">
                <div className="flex flex-col items-start text-left gap-3.5 md:gap-4 max-w-2xl pointer-events-auto">
                    
                    {/* Category / Trending pill */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 backdrop-blur-md shadow-[0_0_15px_rgba(229,9,20,0.3)]">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white">
                            Trending Spotlight
                        </span>
                    </div>

                    {/* Title */}
                    <h1 
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.08] text-white line-clamp-2 font-sora tracking-tight drop-shadow-xl"
                    >
                        {activeSlide.title}
                    </h1>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-white/90">
                        {activeSlide.rating && activeSlide.rating !== "?" && (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                                {activeSlide.rating} Match
                            </span>
                        )}
                        <span className="text-zinc-300 font-semibold">{activeSlide.release}</span>
                        <span className="bg-white/10 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border border-white/15 text-white/90">
                            {activeSlide.type}
                        </span>
                        <span className="bg-white/10 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border border-white/15 text-accent-warm">
                            {activeSlide.quality}
                        </span>
                    </div>

                    {/* Description */}
                    <p 
                        className="text-zinc-300 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-3 md:line-clamp-4 font-medium max-w-xl drop-shadow-md"
                    >
                        {activeSlide.description}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto pt-2">
                        {/* Play Action */}
                        <Link href={activeSlide.link} scroll={false} className="flex-1 sm:flex-none">
                            <button 
                                className="w-full flex items-center justify-center gap-2 px-7 py-2.5 md:py-3 bg-white text-black hover:bg-zinc-200 font-extrabold rounded-xl transition-all shadow-xl active:scale-95 cursor-pointer text-sm md:text-base group/btn"
                            >
                                <Play className="w-4 h-4 md:w-5 h-5 fill-black group-hover/btn:scale-110 transition-transform" />
                                <span>Play Now</span>
                            </button>
                        </Link>

                        {/* View Details Action */}
                        <Link href={activeSlide.link} scroll={false} className="flex-1 sm:flex-none">
                            <button 
                                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 md:py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-xl border border-white/15 transition-all shadow-lg active:scale-95 cursor-pointer text-sm md:text-base"
                            >
                                <Info className="w-4 h-4 md:w-5 h-5" />
                                <span>Details</span>
                            </button>
                        </Link>
                        
                        {/* My List / Watchlist Action */}
                        <button 
                            onClick={toggleWatchlist}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-xl border backdrop-blur-md transition-all shadow-lg active:scale-95 cursor-pointer text-sm md:text-base ${
                                inWatchlist 
                                    ? "bg-accent/20 border-accent/40 text-accent font-bold" 
                                    : "bg-white/10 hover:bg-white/20 border-white/15 text-white font-bold"
                            }`}
                            title={inWatchlist ? "Remove from My List" : "Add to My List"}
                        >
                            {inWatchlist ? <Check className="w-4 h-4 md:w-5 h-5" /> : <Plus className="w-4 h-4 md:w-5 h-5" />}
                            <span className="hidden sm:inline">{inWatchlist ? "In List" : "My List"}</span>
                        </button>

                        {/* Surprise Me Action */}
                        <button 
                            onClick={() => {
                                if (typeof window !== "undefined") {
                                    window.dispatchEvent(new Event("openRandomizer"));
                                }
                            }}
                            className="hidden sm:flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 bg-pink-600/80 hover:bg-pink-600 border border-pink-500/30 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer text-sm md:text-base"
                            title="Discover something random"
                        >
                            <Shuffle className="w-4 h-4" />
                            <span className="hidden md:inline">Surprise Me</span>
                        </button>

                        {/* Mute Button Toggle when trailer is playing */}
                        {activeTrailerKey && (
                            <button 
                                onClick={toggleMute}
                                className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-md text-white transition-all active:scale-90 cursor-pointer shadow-xl"
                                title={isMuted ? "Unmute Trailer" : "Mute Trailer"}
                                aria-label={isMuted ? "Unmute Trailer" : "Mute Trailer"}
                            >
                                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Slide Navigation Controls & Indicators Right-bottom */}
            <div className="absolute bottom-6 right-4 sm:right-6 md:right-12 flex items-center gap-3 z-30 pointer-events-auto">
                {/* Prev / Next Chevrons */}
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-xl">
                    <button
                        onClick={prevSlide}
                        className="p-2 hover:bg-white/15 text-white/80 hover:text-white rounded-lg transition-colors active:scale-90 cursor-pointer"
                        aria-label="Previous featured slide"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-mono font-bold text-zinc-400 px-1">
                        {current + 1} / {slides.length}
                    </span>
                    <button
                        onClick={nextSlide}
                        className="p-2 hover:bg-white/15 text-white/80 hover:text-white rounded-lg transition-colors active:scale-90 cursor-pointer"
                        aria-label="Next featured slide"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Direct Dot Indicators (Desktop) */}
                <div className="hidden lg:flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-xl">
                    {slides.slice(0, 8).map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => goToSlide(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                                idx === current 
                                    ? "w-6 bg-accent shadow-[0_0_8px_var(--accent-glow)]" 
                                    : "w-2 bg-white/20 hover:bg-white/40"
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Slide Progress Row at very bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5 z-30">
                <div 
                    className="h-full bg-gradient-to-r from-accent to-accent-warm origin-left will-change-transform" 
                    style={{ 
                        width: "100%",
                        transform: `scaleX(${(current + 1) / (slides.length || 1)})`,
                        transition: prefersReducedMotion ? "none" : "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)"
                    }}
                />
            </div>
        </section>
    );
}
