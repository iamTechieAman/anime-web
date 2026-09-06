"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import AnimeCard, { type Show } from "./AnimeCard";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useUserStore, isKidsFriendly } from "@/store/userStore";

export default function SimilarAnime({ currentShowId, showName }: { currentShowId: string; showName: string }) {
    const [similar, setSimilar] = useState<Show[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const { profiles, activeProfileId } = useUserStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const isKidsMode = activeProfile?.isKids || false;
    const similarList = Array.isArray(similar) ? similar : [];
    const displayedSimilar = isKidsMode ? similarList.filter(show => show && isKidsFriendly(show as any)) : similarList;

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 8);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        checkScroll();
        el.addEventListener('scroll', checkScroll, { passive: true });
        const ro = new ResizeObserver(checkScroll);
        ro.observe(el);
        return () => { 
            el.removeEventListener('scroll', checkScroll); 
            ro.disconnect(); 
        };
    }, [checkScroll, displayedSimilar]);

    const scroll = (dir: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const cardWidth = el.querySelector('[data-card]')?.clientWidth || 200;
        const visibleCards = Math.floor(el.clientWidth / cardWidth);
        const amount = cardWidth * Math.max(2, visibleCards - 1);
        const target = el.scrollLeft + (dir === 'right' ? amount : -amount);
        const clampedTarget = Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth));

        el.scrollTo({
            left: clampedTarget,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        let isCurrent = true;
        const controller = new AbortController();
        setLoading(true);

        const fetchSimilar = async () => {
            try {
                // Fetch random popular page for pseudo-similar randomness
                const page = Math.floor(Math.random() * 3) + 1;
                const { data } = await axios.get(`/api/anime/popular?page=${page}`, {
                    signal: controller.signal
                });
                
                if (isCurrent && !controller.signal.aborted && data?.shows?.length > 0) {
                    // Filter out current show & shuffle
                    let filtered = data.shows.filter((s: Show) => s && s._id !== currentShowId);
                    filtered = filtered.sort(() => 0.5 - Math.random());
                    setSimilar(filtered.slice(0, 10)); // Top 10 similar
                }
            } catch (err: any) {
                if (!axios.isCancel(err) && !controller.signal.aborted) {
                    console.error("Failed to fetch similar anime:", err);
                }
            } finally {
                if (isCurrent && !controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchSimilar();
        return () => {
            isCurrent = false;
            controller.abort();
        };
    }, [currentShowId]);

    if (!loading && displayedSimilar.length === 0) return null;

    return (
        <div className="mt-12 mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-accent-warm animate-pulse" />
                <h2 className="text-lg md:text-xl font-bold text-white font-sora">
                    Because you watched <span className="text-accent-warm">{showName.split(' ')[0]}</span>...
                </h2>
            </div>
            
            <div className="relative group/row w-full overflow-hidden">
                {/* Prev arrow */}
                <button
                    onClick={() => scroll('left')}
                    aria-label="Scroll left"
                    className={`absolute left-0 top-0 bottom-[40px] z-20 w-10 flex items-center justify-center bg-gradient-to-r from-bg-main to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 ${canScrollLeft ? '' : 'pointer-events-none !opacity-0'}`}
                >
                    <div className="w-8 h-8 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center shadow-xl hover:bg-zinc-700 transition-colors">
                        <ChevronLeft className="w-4 h-4 text-white" />
                    </div>
                </button>

                {/* Content Container */}
                {loading ? (
                    <div className="flex gap-3 overflow-hidden py-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="w-[140px] sm:w-[160px] md:w-[200px] lg:w-[220px] aspect-[2/3] bg-white/5 rounded-xl animate-pulse border border-border-color shrink-0" />
                        ))}
                    </div>
                ) : (
                    <div
                        ref={scrollRef}
                        className="netflix-row"
                    >
                        {displayedSimilar.map((show, idx) => (
                            <div key={`similar-${show._id || show.id}-${idx}`} data-card className="netflix-card-snap w-[140px] sm:w-[160px] md:w-[200px] lg:w-[220px]">
                                <AnimeCard show={show} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Next arrow */}
                <button
                    onClick={() => scroll('right')}
                    aria-label="Scroll right"
                    className={`absolute right-0 top-0 bottom-[40px] z-20 w-10 flex items-center justify-center bg-gradient-to-l from-bg-main to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 ${canScrollRight ? '' : 'pointer-events-none !opacity-0'}`}
                >
                    <div className="w-8 h-8 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center shadow-xl hover:bg-zinc-700 transition-colors">
                        <ChevronRight className="w-4 h-4 text-white" />
                    </div>
                </button>
            </div>
        </div>
    );
}
