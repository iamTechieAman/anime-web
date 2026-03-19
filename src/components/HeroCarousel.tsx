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
            setIsLoading(false);
        }
    }, [data, error]);

    const normalizeUrl = (url: string | null | undefined): string => {
        if (!url) return '';
        if (url.startsWith('//')) return `https:${url}`;
        if (url.startsWith('/')) return `https://hianime.to${url}`; // Fallback for relative hianime paths
        return url;
    };

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
                let year = "2026";

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
                    image: normalizeUrl(banner || cover || item.image),
                    cover: normalizeUrl(cover || item.image),
                    tags: ["Anime", "HD", "New"],
                    rating,
                    release: year,
                    quality: "HD",
                    type: "TV",
                    link: `/watch/anime/${item.id}?provider=anikai`
                };
            });

            const validSlides = formattedSlides.filter(s => s.image && s.image !== '');
            console.log("[HeroCarousel] Raw slides count:", rawSlides.length);
            console.log("[HeroCarousel] Valid slides count:", validSlides.length);
            console.log("[HeroCarousel] Raw slides sample:", rawSlides[0]);
            
            if (validSlides.length > 0) {
                setSlides(validSlides);
            } else {
                console.warn("[HeroCarousel] No valid slides found after processing. Setting fallback to raw slides if any.", formattedSlides);
                if (formattedSlides.length > 0) {
                    setSlides(formattedSlides);
                }
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
                    {/* Background Image with Zoom Effect */}
                    <div className="absolute inset-0 overflow-hidden">
                        <motion.div
                            animate={{ scale: [1, 1.05] }}
                            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
                            className="absolute inset-0"
                        >
                            <img
                                src={activeSlide.image}
                                alt={activeSlide.title}
                                className="w-full h-full object-cover object-center opacity-70"
                            />
                        </motion.div>
                        
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
                    key={activeSlide.id + "-countdown"}
                    className="bg-purple-600 text-white text-[10px] md:text-xs font-black px-3 py-1.5 rounded-sm shadow-lg flex items-center gap-2 backdrop-blur-md"
                >
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    EP {activeSlide.rating.replace('%', '').slice(0,1) || '1'} IN 2d 14h
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
                            {/* Metadata Badges - Stagger 1 */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="flex flex-wrap items-center gap-2 mb-4"
                            >
                                <span className="bg-[#FF5722] text-white px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider">
                                    {activeSlide.type}
                                </span>
                                <span className="bg-white/10 text-white px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase backdrop-blur-md border border-white/5">
                                    {activeSlide.quality}
                                </span>
                                <span className="text-xs font-bold text-white/70 flex items-center gap-1 ml-1">
                                    <Clock className="w-3.5 h-3.5" /> 24m
                                </span>
                                <span className="text-xs font-bold text-white/70 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" /> {activeSlide.release}
                                </span>
                            </motion.div>

                            {/* Title - Stagger 2 */}
                            <motion.h1
                                initial={{ y: 25, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="text-4xl md:text-6xl font-black leading-tight text-white mb-4 line-clamp-2 font-sora tracking-tighter"
                            >
                                {activeSlide.title}
                            </motion.h1>

                            {/* Description - Stagger 3 */}
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.35 }}
                                className="text-white/70 text-sm md:text-base line-clamp-2 md:line-clamp-3 leading-relaxed max-w-xl mb-8 font-medium"
                            >
                                {activeSlide.description}
                            </motion.p>

                            {/* Action Buttons - Stagger 4 */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                                className="flex items-center gap-3 md:gap-4"
                            >
                                <Link href={activeSlide.link}>
                                    <button className="flex items-center gap-2.5 px-8 md:px-10 py-3.5 md:py-4 bg-white text-black hover:bg-white/90 font-black rounded-sm transition-all active:scale-95 group/btn shadow-[0_4px_20px_rgba(255,255,255,0.2)]">
                                        <Play className="w-5 h-5 fill-current" />
                                        WATCH NOW
                                    </button>
                                </Link>
                                <button className="flex items-center gap-2.5 px-6 py-3.5 md:py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-sm border border-white/5 transition-all backdrop-blur-xl group/details">
                                    Details <ChevronRight className="w-4 h-4 transition-transform group-hover/details:translate-x-1" />
                                </button>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-10 right-4 md:right-8 flex items-center gap-2 z-30">
                <button
                    onClick={prevSlide}
                    className="p-3 md:p-4 bg-white/5 hover:bg-white/10 text-white rounded-sm border border-white/5 transition-all backdrop-blur-md active:scale-90"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={nextSlide}
                    className="p-3 md:p-4 bg-white/5 hover:bg-white/10 text-white rounded-sm border border-white/5 transition-all backdrop-blur-md active:scale-90"
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
