"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import useSWR from 'swr';
import { Play, ChevronLeft, ChevronRight, Bookmark } from "lucide-react";
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
            const formattedSlides: Slide[] = await Promise.all(rawSlides.map(async (item: any) => {
                let image = item.image;
                let cover = item.extra?.cover;
                let banner = null;
                let rating = "?";
                let year = "2026"; // Dynamic year ideally

                // If we have AniList ID, fetch high-res metadata
                if (item.extra?.aniListId) {
                    try {
                        const alRes = await axios.post('https://graphql.anilist.co', {
                            query: `query($id: Int) { Media(id:$id) { bannerImage coverImage{extraLarge} averageScore seasonYear genres format } }`,
                            variables: { id: item.extra.aniListId }
                        });
                        const media = alRes.data.data.Media;
                        banner = media.bannerImage;
                        cover = media.coverImage.extraLarge;
                        if (media.averageScore) rating = `${media.averageScore}%`;
                        if (media.seasonYear) year = media.seasonYear.toString();
                    } catch (e) { /* ignore */ }
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
            }));

            const validSlides = formattedSlides.filter(s => s.image && !s.image.includes('undefined'));
            if (validSlides.length > 0) {
                setSlides(validSlides);
                setIsLoading(false);
            }
        } catch (err) {
            console.error("Error processing slides:", err);
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
            <div className="relative w-full h-[500px] md:h-[600px] bg-[var(--bg-main)] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (slides.length === 0) return null;

    const activeSlide = slides[current];

    return (
        <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden group bg-[var(--bg-main)]">
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                    key={activeSlide.id}
                    initial={{ opacity: 0.5, scale: 1.05 }} // Reduced initial scale to prevent jarring zoom
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

                        {/* Gradient Overlay for Text Readability - Adjusted for Light Mode visibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/40 to-transparent dark:via-[var(--bg-main)]/80" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-main)] via-[var(--bg-main)]/40 to-transparent dark:via-[var(--bg-main)]/80" />
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
                            <h1 className="text-3xl md:text-5xl lg:text-5xl font-black leading-tight text-[var(--text-main)] drop-shadow-xl line-clamp-2">
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
                            <div className="flex items-center gap-6 md:gap-8 py-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] md:text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Score</span>
                                    <div className="flex items-center gap-1 text-[var(--text-main)]">
                                        <span className="font-black text-lg">{activeSlide.rating}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] md:text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Release</span>
                                    <span className="font-bold text-[var(--text-main)] text-lg">{activeSlide.release}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] md:text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Quality</span>
                                    <span className="font-bold text-green-600 text-lg">{activeSlide.quality}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-2">
                                <Link href={activeSlide.link}>
                                    <button className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-3.5 bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(255,87,34,0.3)] hover:shadow-[0_0_30px_rgba(255,87,34,0.5)] active:scale-95 group-hover:animate-pulse">
                                        <Play className="w-5 h-5 fill-current" />
                                        WATCH NOW
                                    </button>
                                </Link>
                                <button className="p-3 md:p-3.5 bg-[var(--bg-card)] hover:bg-[var(--bg-main)] text-[var(--text-main)] rounded-lg border border-[var(--border-color)] transition-colors backdrop-blur-sm">
                                    <Bookmark className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-6 right-4 md:bottom-8 md:right-8 flex items-center gap-4 z-20">
                {/* Slide Counter */}
                <span className="text-xl md:text-2xl font-bold text-[var(--text-main)]/20 select-none font-mono">
                    {(current + 1).toString().padStart(2, '0')} <span className="text-base text-[var(--text-main)]/10">/ {slides.length.toString().padStart(2, '0')}</span>
                </span>

                <div className="flex gap-2">
                    <button
                        onClick={prevSlide}
                        className="p-2 md:p-3 bg-[var(--bg-card)]/40 hover:bg-[#FF5722] text-[var(--text-main)] hover:text-white rounded-full backdrop-blur-md border border-[var(--border-color)] transition-all active:scale-90"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="p-2 md:p-3 bg-[var(--bg-card)]/40 hover:bg-[#FF5722] text-[var(--text-main)] hover:text-white rounded-full backdrop-blur-md border border-[var(--border-color)] transition-all active:scale-90"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-1 bg-[#FF5722]" style={{ width: `${((current + 1) / slides.length) * 100}%`, transition: 'width 0.5s ease-out' }}></div>
        </div>
    );
}
