"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import axios from "axios";
import { Loader2, ArrowLeft, Film, Tv, Sparkles, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AZFilter from "@/components/AZFilter";
import { AnimeGrid, type Show } from "@/components/AnimeCard";

const TABS = [
    { id: "movies", label: "Movies & TV", icon: Film },
    { id: "anime", label: "Anime", icon: Tv },
];

export default function AZListPage({ params }: { params: Promise<{ letter: string }> }) {
    const resolvedParams = use(params);
    const letter = resolvedParams.letter;
    const displayLetter = letter === "0-9" ? "0-9" : letter.toUpperCase();

    const [shows, setShows] = useState<Show[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("movies");
    const [animeCount, setAnimeCount] = useState(0);
    const [movieCount, setMovieCount] = useState(0);

    useEffect(() => {
        const fetchShows = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`/api/anime/az?letter=${letter}&page=${page}&tab=${activeTab}`, {
                    timeout: 20000,
                });
                setShows(res.data.shows || []);
                setAnimeCount(res.data.animeCount || 0);
                setMovieCount(res.data.movieCount || 0);
            } catch (err: any) {
                console.error("Failed to fetch A-Z list", err);
                setError(err.response?.data?.error || err.message || "Failed to load content. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchShows();
    }, [letter, page, activeTab]);

    return (
        <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans">
            {/* Navbar */}
            <div className="fixed top-0 left-0 md:left-[72px] right-0 z-50 px-4 py-3 bg-[var(--bg-overlay)] backdrop-blur-xl border-b border-[var(--border-color)]">
                <div className="w-full flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-zinc-400" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg">Browse: <span className="text-orange-400">{displayLetter}</span></h1>
                        <p className="text-xs text-[var(--text-muted)]">
                            {!loading && `${shows.length} results`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="pt-20 pb-24 md:pb-12 w-full px-4 md:px-6 space-y-6">
                {/* A-Z Filter Bar */}
                <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)] sticky top-16 z-40 shadow-xl">
                    <AZFilter />
                </div>

                {/* Tab Bar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                                    ${isActive
                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-900/30"
                                        : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] hover:bg-[var(--border-color)] hover:text-white"
                                    }
                                `}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {!loading && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-[var(--border-color)]'}`}>
                                        {tab.id === "everything" ? shows.length :
                                         tab.id === "anime" ? animeCount :
                                         movieCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-20"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
                                <Loader2 className="w-12 h-12 animate-spin text-orange-500 relative z-10" />
                            </div>
                            <p className="text-[var(--text-muted)] animate-pulse mt-4 text-sm">
                                Loading {activeTab === "movies" ? "movies & TV" : activeTab === "anime" ? "anime" : "content"} starting with "{displayLetter}"...
                            </p>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-20 text-center"
                        >
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md">
                                <p className="text-red-400 font-medium mb-4">{error}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-bold"
                                >
                                    Retry
                                </button>
                            </div>
                        </motion.div>
                    ) : shows.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-20 text-center"
                        >
                            <Search className="w-12 h-12 text-[var(--text-muted)] mb-4 opacity-50" />
                            <p className="text-[var(--text-muted)] text-lg font-medium">No results found for "{displayLetter}"</p>
                            <p className="text-[var(--text-muted)] text-sm mt-2 opacity-70">Try a different letter or tab</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={`content-${activeTab}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <AnimeGrid shows={shows} />

                            {/* Pagination */}
                            <div className="flex justify-center items-center gap-4 mt-8">
                                <button
                                    disabled={page === 1}
                                    onClick={() => {
                                        setPage(p => Math.max(1, p - 1));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="px-6 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl disabled:opacity-30 hover:bg-[var(--border-color)] transition-colors font-medium"
                                >
                                    ← Previous
                                </button>
                                <span className="flex items-center px-4 font-bold text-[var(--text-muted)] text-sm">
                                    Page {page}
                                </span>
                                <button
                                    disabled={shows.length === 0}
                                    onClick={() => {
                                        setPage(p => p + 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-bold"
                                >
                                    Next →
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
