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

    // Poll every 5 minutes (300000ms) to check for new trending anime
    const { data, error, isLoading: isSwrLoading } = useSWR('/api/anime/home', fetcher, {
        refreshInterval: 60000,
        revalidateOnFocus: true,
        dedupingInterval: 60000,
    });

    useEffect(() => {
        if (data?.slides) {
            processSlides(data.slides);
        } else if (error) {
            console.error("Failed to fetch home slides:", error);
            // Optional: fallback logic here
        }
    }, [data, error]);

    const processSlides = async (rawSlides: any[]) => {
        console.log("[HeroCarousel] Processing slides from SWR...");
        try {
            const idsToFetch = rawSlides
                .map(item => item.extra?.aniListId)
                .filter(id => id != null);

            let anilistDataMap = new Map();

            if (idsToFetch.length > 0) {
                try {
                    const alRes = await axios.post('https://graphql.anilist.co', {
                        query: `query($ids: [Int]) { Page(page: 1, perPage: 50) { media(id_in: $ids) { id bannerImage coverImage{extraLarge} averageScore seasonYear genres format } } }`,
                        variables: { ids: idsToFetch }
                    });
                    
                    const mediaList = alRes.data?.data?.Page?.media || [];
                    mediaList.forEach((media: any) => {
                        anilistDataMap.set(media.id, media);
                    });
                } catch (e) {
                    console.error("Batched AniList fetch failed:", e);
                }
            }

            const formattedSlides: Slide[] = rawSlides.map((item: any) => {
                let image = item.image;
                let cover = item.extra?.cover;
                let banner = null;
                let rating = "?";
                let year = "2026"; // Dynamic year ideally

                const alId = item.extra?.aniListId;
                if (alId && anilistDataMap.has(alId)) {
                    const media = anilistDataMap.get(alId);
                    banner = media.bannerImage;
                    cover = media.coverImage?.extraLarge || cover;
                    if (media.averageScore) rating = `${media.averageScore}%`;
                    if (media.seasonYear) year = media.seasonYear.toString();
                }

                return {
                    id: item.id,
                    title: item.title,
                    description: item.extra?.description || "No description.",
                    image: banner || cover || item.image,
                    cover: cover || item.image,
                    tags: ["Anime", "HD", "New"],
                    rating,
                    release: year,
                    quality: "HD",
                    type: "TV",
                    link: `/watch/${item.id}?provider=anikai`
                };
            });

            const validSlides = formattedSlides.filter(s => s.image && !s.image.includes('undefined'));
            if (validSlides.length > 0) {
                setSlides(validSlides);
            } else {
                console.warn("[HeroCarousel] No valid slides found after processing.");
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
            <div className="relative w-full aspect-video md:aspect-[21/9] min-h-[450px] md:max-h-[700px] bg-[var(--bg-main)] flex items-center justify-center border-b border-[var(--border-color)]">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (slides.length === 0) return null;

    const activeSlide = slides[current];

    return (
        <div className="relative w-full aspect-video md:aspect-[21/9] min-h-[450px] md:max-h-[700px] overflow-hidden group bg-[var(--bg-main)]">
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={activeSlide.id}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }} // Snappier duration (was 0.8)
                    className="absolute inset-0"
                >
                    {/* Background Image */}
                    <div className="absolute inset-0">
                        <Image
                            src={activeSlide.image}
                            alt={activeSlide.title}
                            fill
                            className="object-cover object-center opacity-80 dark:opacity-60"
                            priority
                            quality={90}
                            sizes="(max-width: 768px) 100vw, 100vw"
                        />
                        {/* Pre-fetch next slide image for lag-free transition */}
                        <div className="hidden">
                            <Image
                                src={slides[(current + 1) % slides.length]?.image}
                                alt="preload"
                                width={10}
                                height={10}
                                priority
                            />
                        </div>

                        {/* Gradient Overlay for Text Readability - JustAnime style (dark vignette) */}
                        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
                        <div className="absolute inset-y-0 left-0 w-[70%] bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Content Container - Separate from image animation to reduce layout thrashing */}
            <div className="absolute inset-0 flex items-center z-10">
                <div className="max-w-7xl mx-auto px-4 md:px-6 w-full pt-16 md:pt-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSlide.id + "-content"}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }} // Smooth exit for text
                            transition={{ delay: 0.1, duration: 0.4 }}
                            className="max-w-2xl space-y-4 md:space-y-6"
                        >
                            {/* Title */}
                            <h1 className="text-3xl md:text-5xl lg:text-5xl font-bold leading-tight text-white drop-shadow-xl line-clamp-2 gap-2 font-sora">
                                {activeSlide.title}
                            </h1>

                            {/* Metadata Row */}
                            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm font-medium text-[var(--text-muted)]">
                                <span className="bg-[#FF5722]/10 text-[#FF5722] px-2 py-0.5 rounded border border-[#FF5722]/20 text-xs font-bold uppercase">
                                    {activeSlide.type}
                                </span>
                                <span className="flex gap-2 text-xs md:text-sm">
                                    {activeSlide.tags.map((tag, i) => (
                                        <span key={i} className={i > 0 ? "hidden sm:inline" : ""}>
                                            {tag}{i < activeSlide.tags.length - 1 && ","}
                                        </span>
                                    ))}
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-[var(--text-muted)] text-sm md:text-base line-clamp-2 md:line-clamp-3 leading-relaxed max-w-xl drop-shadow-md">
                                {activeSlide.description}
                            </p>

                            {/* Stats Block */}
                            <div className="flex items-center gap-3 md:gap-4 py-2 opacity-90">
                                <span className="text-xs font-semibold text-white bg-white/10 px-2 py-0.5 rounded-sm backdrop-blur-md">
                                    ⭐ {activeSlide.rating}
                                </span>
                                <span className="text-[12px] font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> 24m
                                </span>
                                <span className="text-[12px] font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> {activeSlide.release}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 md:gap-4 pt-2">
                                <Link href={activeSlide.link}>
                                    <button className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-3.5 bg-white text-black hover:bg-white/90 font-bold rounded-full transition-all active:scale-95 group/btn">
                                        <Play className="w-5 h-5 fill-current transition-transform group-hover/btn:scale-110" />
                                        WATCH NOW
                                    </button>
                                </Link>
                                <button className="flex items-center gap-2 px-6 py-3 md:py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full border border-white/10 transition-colors backdrop-blur-md">
                                    Details <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-6 right-4 md:bottom-8 md:right-8 flex flex-col items-end gap-3 z-20">
                <div className="flex items-center gap-1.5 p-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                    <button
                        onClick={prevSlide}
                        className="p-2 md:p-2.5 hover:bg-white/10 text-white rounded-full transition-all active:scale-90"
                    >
                        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="p-2 md:p-2.5 hover:bg-white/10 text-white rounded-full transition-all active:scale-90"
                    >
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-1 bg-[#FF5722]" style={{ width: `${((current + 1) / slides.length) * 100}%`, transition: 'width 0.5s ease-out' }}></div>
        </div>
    );
}
