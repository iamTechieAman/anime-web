"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import AnimeCard, { type Show } from "./AnimeCard";
import { Loader2, Sparkles } from "lucide-react";
import { useUserStore, isKidsFriendly } from "@/store/userStore";

export default function SimilarAnime({ currentShowId, showName }: { currentShowId: string; showName: string }) {
    const [similar, setSimilar] = useState<Show[]>([]);
    const [loading, setLoading] = useState(true);

    const { profiles, activeProfileId } = useUserStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const isKidsMode = activeProfile?.isKids || false;
    const displayedSimilar = isKidsMode ? similar.filter(show => isKidsFriendly(show as any)) : similar;

    useEffect(() => {
        const fetchSimilar = async () => {
            try {
                // Fetch random popular page for pseudo-similar randomness
                const page = Math.floor(Math.random() * 3) + 1;
                const { data } = await axios.get(`/api/anime/popular?page=${page}`);
                
                if (data?.shows?.length > 0) {
                    // Filter out current show & shuffle
                    let filtered = data.shows.filter((s: Show) => s._id !== currentShowId);
                    filtered = filtered.sort(() => 0.5 - Math.random());
                    setSimilar(filtered.slice(0, 10)); // Top 10 similar
                }
            } catch (err) {
                console.error("Failed to fetch similar anime:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSimilar();
    }, [currentShowId]);

    if (!loading && displayedSimilar.length === 0) return null;

    return (
        <div className="mt-12 mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" />
                <h2 className="text-lg md:text-xl font-bold text-white font-sora">
                    Because you watched <span className="text-orange-400">{showName.split(' ')[0]}</span>...
                </h2>
            </div>
            
            <div className="relative overflow-hidden w-full">
                {loading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="aspect-[3/4.5] bg-white/5 rounded-xl animate-pulse border border-[var(--border-color)]" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                        {displayedSimilar.map((show, idx) => (
                            <AnimeCard key={`similar-${show._id}-${idx}`} show={show} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
