"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ChevronLeft, SlidersHorizontal, Grid, List } from "lucide-react";
import { AnimeGrid, type Show } from "@/components/AnimeCard";

export default function GenrePage() {
    const params = useParams();
    const genre = params.id as string;
    const [shows, setShows] = useState<Show[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        if (!genre) return;
        const controller = new AbortController();
        const fetchGenreData = async () => {
            setIsLoading(true);
            try {
                const res = await axios.get(`/api/anime/genre?name=${encodeURIComponent(genre)}&provider=hianime`, {
                    signal: controller.signal
                });
                if (!controller.signal.aborted) {
                    setShows(res.data.shows || []);
                }
            } catch (error: any) {
                if (!axios.isCancel(error) && !controller.signal.aborted) {
                    console.error("Failed to fetch genre shows:", error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchGenreData();
        return () => controller.abort();
    }, [genre]);

    const capitalizedGenre = genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : "";

    return (
        <main className="min-h-dvh pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-[2000px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <Link scroll={false} href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-white transition-colors mb-2">
                            <ChevronLeft className="w-4 h-4" /> Back Home
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-black font-sora text-white">
                             Genre: <span className="text-[#FF5722]">{capitalizedGenre}</span>
                        </h1>
                        <p className="text-[var(--text-muted)] text-sm mt-2">
                            Browsing all {capitalizedGenre} anime titles available.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-bg-card rounded-lg p-1 border border-border-color">
                             <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-[var(--text-muted)] hover:text-white'}`}
                             >
                                <Grid className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-[var(--text-muted)] hover:text-white'}`}
                             >
                                <List className="w-4 h-4" />
                             </button>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-color rounded-lg text-sm text-[var(--text-muted)] hover:text-white transition-colors">
                            <SlidersHorizontal className="w-4 h-4" /> Filter
                        </button>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {[...Array(24)].map((_, i) => (
                            <div key={i} className="aspect-[3/4] bg-bg-card animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : shows.length > 0 ? (
                    <AnimeGrid shows={shows} />
                ) : (
                    <div className="flex flex-col items-center justify-center py-4 md:py-6 text-center">
                        <div className="w-20 h-20 bg-bg-card rounded-full flex items-center justify-center mb-4">
                            <Grid className="w-10 h-10 text-[var(--text-muted)]" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">No Anime Found</h2>
                        <p className="text-[var(--text-muted)] max-w-sm">
                            We couldn&apos;t find any anime for this genre at the moment. Try switching providers or checking back later.
                        </p>
                        <Link scroll={false} href="/" className="mt-6 px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-all">
                            Browse Home
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
