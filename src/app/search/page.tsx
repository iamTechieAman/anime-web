"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, X, TrendingUp, Sparkles, SlidersHorizontal, ChevronDown } from "lucide-react";
import { MovieGrid, type MovieItem } from "@/components/MovieCard";

const GENRE_MAP: Record<string, number> = {
    "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35,
    "Crime": 80, "Documentary": 99, "Drama": 18, "Family": 10751,
    "Fantasy": 14, "History": 36, "Horror": 27, "Music": 10402,
    "Mystery": 9648, "Romance": 10749, "Sci-Fi": 878, "Thriller": 53,
    "War": 10752, "Western": 37
};

const CONTENT_TYPES = [
    { label: "All", value: "" },
    { label: "Movies", value: "movie" },
    { label: "TV Shows", value: "tv" }
];

const SORT_OPTIONS = [
    { label: "Popularity", value: "popularity.desc" },
    { label: "Rating", value: "vote_average.desc" },
    { label: "Release Date", value: "primary_release_date.desc" },
    { label: "Title A-Z", value: "original_title.asc" }
];

function MovieSearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams?.get("query") || searchParams?.get("q") || "";
    const genre = searchParams?.get("genre") || "";
    const status = searchParams?.get("status") || "";
    
    const [results, setResults] = useState<MovieItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const performSearch = useCallback(() => {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (query) params.set("query", query);
        if (genre && !query) params.set("genre", genre);
        if (status && !query) params.set("status", status);

        axios.get(`/api/prime/search?${params.toString()}`)
            .then(res => {
                setResults(res.data.results || []);
                setError(null);
            })
            .catch(err => {
                console.error("Search failed:", err);
                setError("Failed to connect to the database. Please try again.");
                setResults([]);
            })
            .finally(() => setLoading(false));
    }, [query, genre, status]);

    useEffect(() => {
        performSearch();
    }, [performSearch]);

    const title = query 
        ? `Results for "${query}"` 
        : genre 
        ? `${genre} Movies & TV` 
        : status 
        ? `${status} Content`
        : "Discover Content";

    return (
        <main className="min-h-screen pt-20 pb-24 px-4 md:px-8 w-full bg-[var(--bg-main)]">
            {/* Search Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl md:text-4xl font-black text-[var(--text-main)]">
                        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {title}
                        </span>
                    </h1>
                    
                    {/* Filters Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${showFilters ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-[var(--text-muted)]'}`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span className="hidden sm:inline">Filters</span>
                    </button>
                </div>

                {/* Filters Panel */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 mb-4 space-y-4">
                                {/* Genres */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Genre</label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(GENRE_MAP).map(g => (
                                            <button
                                                key={g}
                                                onClick={() => {
                                                    router.push(genre === g ? '/search' : `/search?genre=${g}`, { scroll: false });
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${genre === g ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)] hover:border-purple-500/50 hover:text-purple-400'}`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Quick Genre Chips (always visible) */}
                {!showFilters && !query && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1">
                        {["Action", "Comedy", "Horror", "Romance", "Sci-Fi", "Thriller", "Drama", "Fantasy"].map((g, i) => (
                            <motion.button
                                key={g}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => router.push(`/search?genre=${g}`, { scroll: false })}
                                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 ${genre === g ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-blue-500/50'}`}
                            >
                                {g}
                            </motion.button>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Results */}
            {loading ? (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="flex flex-col justify-center items-center py-32 gap-6"
                >
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse rounded-full" />
                        <div className="w-16 h-16 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin relative z-10" />
                        <Search className="absolute inset-0 m-auto w-6 h-6 text-blue-400 z-10" />
                    </div>
                    <p className="text-sm font-medium tracking-widest uppercase text-blue-400/80 animate-pulse">Searching Database</p>
                </motion.div>
            ) : error ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col flex-1 items-center justify-center text-center py-20"
                >
                    <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
                        <X className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="text-xl font-bold mb-2 text-white">
                        Something went wrong
                    </p>
                    <p className="text-sm text-[var(--text-muted)] max-w-xs mb-6">
                        {error}
                    </p>
                    <button 
                        onClick={performSearch}
                        className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors"
                    >
                        Try Again
                    </button>
                </motion.div>
            ) : results.length > 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="pb-12"
                >
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-bold text-[var(--text-main)]">{results.length}</span> results found
                        </p>
                    </div>
                    <MovieGrid items={results} />
                </motion.div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col flex-1 items-center justify-center text-center py-20"
                >
                    <div className="w-20 h-20 bg-[var(--bg-card)] rounded-2xl flex items-center justify-center mb-6 border border-[var(--border-color)]">
                        <Search className="w-8 h-8 text-[var(--text-muted)]" />
                    </div>
                    <p className="text-xl font-bold mb-2 text-[var(--text-main)]">
                        {query ? "No results found" : "Start searching"}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] max-w-xs">
                        {query ? "Try different keywords or browse genres above." : "Type to find your favorite movies, TV shows, and anime."}
                    </p>
                </motion.div>
            )}
        </main>
    );
}

export default function MovieSearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen pt-24 flex items-center justify-center bg-[var(--bg-main)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-sm text-[var(--text-muted)] animate-pulse">Loading Search...</p>
                </div>
            </div>
        }>
            <MovieSearchContent />
        </Suspense>
    );
}
