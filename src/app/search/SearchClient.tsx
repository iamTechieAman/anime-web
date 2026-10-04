"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense, Component, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { MovieGrid, type MovieItem } from "@/components/MovieCard";
import { GridSkeleton } from "@/components/SkeletonLoader";
import { useUserStore, isKidsFriendly } from "@/store/userStore";
import { useDebounce } from "@/hooks/useDebounce";

const GENRE_MAP: Record<string, number> = {
    "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35,
    "Crime": 80, "Documentary": 99, "Drama": 18, "Family": 10751,
    "Fantasy": 14, "History": 36, "Horror": 27, "Music": 10402,
    "Mystery": 9648, "Romance": 10749, "Sci-Fi": 878, "Thriller": 53,
    "War": 10752, "Western": 37
};

const POPULAR_GENRES = ["Action", "Animation", "Comedy", "Sci-Fi", "Drama", "Fantasy", "Horror"];

// Lightweight Error Boundary to protect the search layout from crashing
interface SearchErrorBoundaryProps {
    children: ReactNode;
    onReset?: () => void;
}

interface SearchErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class SearchErrorBoundary extends Component<SearchErrorBoundaryProps, SearchErrorBoundaryState> {
    constructor(props: SearchErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): SearchErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("[SearchErrorBoundary] Caught render error:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Display error</h2>
                    <p className="text-sm text-[var(--text-muted)] max-w-sm mb-6">
                        An error occurred while rendering the search results.
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function MovieSearchContent() {
    const { profiles, activeProfileId } = useUserStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const isKidsMode = activeProfile?.isKids || false;

    const searchParams = useSearchParams();
    const router = useRouter();

    const initialQuery = searchParams?.get("q") || searchParams?.get("query") || "";
    const initialGenre = searchParams?.get("genre") || "";
    const initialStatus = searchParams?.get("status") || "";

    const [searchInput, setSearchInput] = useState<string>(initialQuery);
    const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre);
    const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);

    // 350ms debounce prevents flooding the backend with rapid keystroke requests
    const debouncedQuery = useDebounce<string>(searchInput, 350);

    const [results, setResults] = useState<MovieItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState<boolean>(false);

    // AbortController ref to cancel in-flight requests when typing continues
    const abortControllerRef = useRef<AbortController | null>(null);

    // Synchronize external query changes (e.g. from Header search or deep links)
    useEffect(() => {
        const q = searchParams?.get("q") || searchParams?.get("query") || "";
        const g = searchParams?.get("genre") || "";
        const s = searchParams?.get("status") || "";

        if (q !== searchInput && q !== debouncedQuery) {
            setSearchInput(q);
        }
        if (g !== selectedGenre) setSelectedGenre(g);
        if (s !== selectedStatus) setSelectedStatus(s);
    }, [searchParams]);

    // Clean URL synchronization without causing App Router full-page remounts or hydration mismatch
    useEffect(() => {
        if (typeof window === "undefined") return;
        const currentUrl = new URL(window.location.href);
        const currentQ = currentUrl.searchParams.get("q") || currentUrl.searchParams.get("query") || "";
        const currentG = currentUrl.searchParams.get("genre") || "";
        const currentS = currentUrl.searchParams.get("status") || "";

        const trimmed = debouncedQuery.trim();
        let changed = false;

        if (trimmed !== currentQ) {
            if (trimmed) {
                currentUrl.searchParams.set("q", trimmed);
                currentUrl.searchParams.delete("query");
            } else {
                currentUrl.searchParams.delete("q");
                currentUrl.searchParams.delete("query");
            }
            changed = true;
        }

        if (selectedGenre !== currentG) {
            if (selectedGenre) {
                currentUrl.searchParams.set("genre", selectedGenre);
            } else {
                currentUrl.searchParams.delete("genre");
            }
            changed = true;
        }

        if (selectedStatus !== currentS) {
            if (selectedStatus) {
                currentUrl.searchParams.set("status", selectedStatus);
            } else {
                currentUrl.searchParams.delete("status");
            }
            changed = true;
        }

        if (changed) {
            window.history.replaceState(
                { ...window.history.state, as: currentUrl.href, url: currentUrl.href },
                "",
                currentUrl.pathname + currentUrl.search
            );
        }
    }, [debouncedQuery, selectedGenre, selectedStatus]);

    // Handle browser forward/back buttons smoothly
    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const q = params.get("q") || params.get("query") || "";
            const g = params.get("genre") || "";
            const s = params.get("status") || "";
            setSearchInput(q);
            setSelectedGenre(g);
            setSelectedStatus(s);
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    // Perform Search with AbortController for race condition protection
    const performSearch = useCallback(async () => {
        const query = debouncedQuery.trim();

        // If no query and no filter selected, clear results and stop
        if (!query && !selectedGenre && !selectedStatus) {
            setResults([]);
            setLoading(false);
            setError(null);
            return;
        }

        // Cancel previous pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (selectedGenre && !query) params.set("genre", selectedGenre);
        if (selectedStatus && !query) params.set("status", selectedStatus);

        try {
            const res = await axios.get(`/api/prime/search?${params.toString()}`, {
                signal: controller.signal,
                timeout: 10000,
            });

            if (controller.signal.aborted) return;

            let fetched: MovieItem[] = res.data.results || [];
            if (isKidsMode) {
                fetched = fetched.filter((item: MovieItem) => item && isKidsFriendly(item));
            }

            setResults(fetched);
            setError(null);
        } catch (err: any) {
            // Silently ignore aborted requests caused by newer keystrokes
            if (axios.isCancel(err) || err.name === "CanceledError" || err.name === "AbortError") {
                return;
            }
            console.error("Search request failed:", err);
            setError("Unable to retrieve search results. Please check your connection and try again.");
            setResults([]);
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, [debouncedQuery, selectedGenre, selectedStatus, isKidsMode]);

    useEffect(() => {
        performSearch();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [performSearch]);

    const handleClearInput = () => {
        setSearchInput("");
    };

    const handleClearAll = () => {
        setSearchInput("");
        setSelectedGenre("");
        setSelectedStatus("");
    };

    const handleGenreSelect = (g: string) => {
        setSelectedGenre(prev => prev === g ? "" : g);
    };

    const title = debouncedQuery 
        ? `Results for "${debouncedQuery}"` 
        : selectedGenre 
        ? `${selectedGenre} Titles` 
        : selectedStatus 
        ? `${selectedStatus} Content`
        : "Discover Content";

    return (
        <main className="min-h-dvh pt-6 pb-24 px-4 md:px-8 w-full bg-bg-main">
            {/* Search Header & Input */}
            <motion.div 
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="max-w-4xl mx-auto mb-8"
            >
                {/* Search Bar Container */}
                <div className="relative w-full mb-6">
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 w-5 h-5 text-[var(--text-muted)] pointer-events-none transition-colors" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search anime, movies, cartoons, genres..."
                            className="w-full h-12 md:h-14 pl-12 pr-24 bg-bg-card border border-border-color focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-2xl text-[var(--text-main)] placeholder-[var(--text-muted)] text-sm md:text-base outline-none transition-all shadow-inner"
                        />
                        <div className="absolute right-3.5 flex items-center gap-1.5">
                            {loading && (
                                <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mr-1" />
                            )}
                            {searchInput && (
                                <button
                                    onClick={handleClearInput}
                                    aria-label="Clear search input"
                                    className="p-1.5 text-[var(--text-muted)] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                aria-label="Toggle filters"
                                className={`p-2 rounded-xl transition-all ${
                                    showFilters || selectedGenre
                                        ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                                        : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters Toggle Panel */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-6"
                        >
                            <div className="bg-bg-card border border-border-color rounded-2xl p-4 space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                            Genre Filter
                                        </label>
                                        {selectedGenre && (
                                            <button
                                                onClick={() => setSelectedGenre("")}
                                                className="text-xs text-blue-400 hover:underline"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(GENRE_MAP).map(g => (
                                            <button
                                                key={g}
                                                onClick={() => handleGenreSelect(g)}
                                                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                                                    selectedGenre === g 
                                                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                                                        : "bg-bg-main border border-border-color text-[var(--text-muted)] hover:border-blue-500/40 hover:text-white"
                                                }`}
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

                {/* Quick Genre Chips */}
                {!showFilters && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1">
                        {POPULAR_GENRES.map((g) => (
                            <button
                                key={g}
                                onClick={() => handleGenreSelect(g)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 ${
                                    selectedGenre === g 
                                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                                        : "bg-bg-card border border-border-color text-[var(--text-muted)] hover:text-white hover:border-blue-500/50"
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Results Title and Count */}
            {(debouncedQuery || selectedGenre || selectedStatus || results.length > 0) && (
                <div className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
                    <h1 className="text-xl md:text-3xl font-black text-[var(--text-main)]">
                        <span className="bg-gradient-to-r from-accent via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                            {title}
                        </span>
                    </h1>
                    {results.length > 0 && !loading && (
                        <p className="text-xs md:text-sm text-[var(--text-muted)] font-medium">
                            <span className="font-bold text-[var(--text-main)]">{results.length}</span> titles found
                        </p>
                    )}
                </div>
            )}

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto">
                {loading ? (
                    <div className="pb-12 space-y-4">
                        <div className="h-5 w-32 bg-white/5 rounded skeleton-shine" />
                        <GridSkeleton count={12} />
                    </div>
                ) : error ? (
                    /* Error State UI */
                    <motion.div 
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center text-center py-16 px-4"
                    >
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20 text-red-400">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-white">
                            Search failed
                        </h2>
                        <p className="text-sm text-[var(--text-muted)] max-w-sm mb-6">
                            {error}
                        </p>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => performSearch()}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Try Again</span>
                            </button>
                            <button
                                onClick={handleClearAll}
                                className="px-5 py-2.5 bg-bg-card border border-border-color hover:border-white/20 text-[var(--text-main)] font-bold rounded-xl transition-colors active:scale-95"
                            >
                                Reset Search
                            </button>
                        </div>
                    </motion.div>
                ) : results.length > 0 ? (
                    /* Results Grid with Error Boundary */
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25 }}
                        className="pb-12"
                    >
                        <SearchErrorBoundary onReset={() => performSearch()}>
                            <MovieGrid items={results} />
                        </SearchErrorBoundary>
                    </motion.div>
                ) : (debouncedQuery || selectedGenre || selectedStatus) ? (
                    /* Empty State: No matches found for current search query */
                    <motion.div 
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center text-center py-16 px-4"
                    >
                        <div className="w-20 h-20 bg-bg-card rounded-3xl flex items-center justify-center mb-6 border border-border-color shadow-xl">
                            <Search className="w-9 h-9 text-[var(--text-muted)] opacity-60" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-black mb-2 text-[var(--text-main)]">
                            No results found
                        </h2>
                        <p className="text-sm text-[var(--text-muted)] max-w-md mb-8">
                            We couldn&apos;t find any titles matching{" "}
                            <span className="font-semibold text-white">
                                &quot;{debouncedQuery || selectedGenre}&quot;
                            </span>
                            . Check for typos or explore popular genres below.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mb-6">
                            {POPULAR_GENRES.map((g) => (
                                <button
                                    key={g}
                                    onClick={() => handleGenreSelect(g)}
                                    className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-bg-card border border-border-color text-[var(--text-muted)] hover:text-white hover:border-blue-500/40 hover:bg-blue-500/10 transition-all active:scale-95"
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleClearAll}
                            className="text-xs text-blue-400 hover:underline font-bold"
                        >
                            Clear all filters
                        </button>
                    </motion.div>
                ) : (
                    /* Initial Discovery State: User hasn't typed anything yet */
                    <motion.div 
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center text-center py-20 px-4"
                    >
                        <div className="w-20 h-20 bg-gradient-to-tr from-accent/20 to-blue-500/20 rounded-3xl flex items-center justify-center mb-6 border border-white/10 shadow-2xl">
                            <Sparkles className="w-9 h-9 text-accent" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black mb-3 text-[var(--text-main)]">
                            Explore the Library
                        </h2>
                        <p className="text-sm md:text-base text-[var(--text-muted)] max-w-md mb-8">
                            Search across thousands of movies, anime series, and cartoons in Full HD.
                        </p>
                        <div className="w-full max-w-xl">
                            <p className="text-xs uppercase tracking-widest font-black text-[var(--text-muted)] mb-3">
                                Popular Categories
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {POPULAR_GENRES.map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => handleGenreSelect(g)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold bg-bg-card border border-border-color text-[var(--text-muted)] hover:text-white hover:border-blue-500/50 hover:bg-blue-500/10 transition-all active:scale-95"
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </main>
    );
}

export default function MovieSearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-dvh pt-24 flex items-center justify-center bg-bg-main">
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
