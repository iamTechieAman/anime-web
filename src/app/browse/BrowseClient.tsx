"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Compass, Film, Tv, Sparkles, Filter, X, SlidersHorizontal, 
    ArrowUpDown, Globe, Calendar, RefreshCw, Loader2 
} from "lucide-react";
import { MovieCard, type MovieItem } from "@/components/MovieCard";
import { GridSkeleton } from "@/components/SkeletonLoader";

const GENRES = [
    { name: "Action", id: "28" },
    { name: "Adventure", id: "12" },
    { name: "Animation", id: "16" },
    { name: "Comedy", id: "35" },
    { name: "Crime", id: "80" },
    { name: "Drama", id: "18" },
    { name: "Family", id: "10751" },
    { name: "Fantasy", id: "14" },
    { name: "History", id: "36" },
    { name: "Horror", id: "27" },
    { name: "Mystery", id: "9648" },
    { name: "Romance", id: "10749" },
    { name: "Sci-Fi", id: "878" },
    { name: "Thriller", id: "53" },
    { name: "War", id: "10752" },
    { name: "Western", id: "37" }
];

const NETWORKS = [
    { name: "Netflix", id: "213", logo: "🔴" },
    { name: "Disney+", id: "2739", logo: "🔵" },
    { name: "Prime Video", id: "1024", logo: "📦" },
    { name: "Apple TV+", id: "2552", logo: "⚪" },
    { name: "HBO", id: "49", logo: "🟣" },
    { name: "Hulu", id: "453", logo: "🟢" },
    { name: "Paramount+", id: "4330", logo: "⛰️" }
];

const LANGUAGES = [
    { name: "English", code: "en" },
    { name: "Japanese", code: "ja" },
    { name: "Hindi", code: "hi" },
    { name: "Spanish", code: "es" },
    { name: "Korean", code: "ko" },
    { name: "French", code: "fr" },
    { name: "German", code: "de" }
];

const COUNTRIES = [
    { name: "United States", code: "US" },
    { name: "India", code: "IN" },
    { name: "Japan", code: "JP" },
    { name: "South Korea", code: "KR" },
    { name: "United Kingdom", code: "GB" }
];

const SORT_OPTIONS = [
    { label: "Popularity Desc", value: "popularity.desc" },
    { label: "Rating Desc", value: "vote_average.desc" },
    { label: "Newest First", value: "primary_release_date.desc" },
    { label: "Oldest First", value: "primary_release_date.asc" },
    { label: "Alphabetical A-Z", value: "original_title.asc" }
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function BrowseClient() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Sync state with URL params
    const [mediaType, setMediaType] = useState<"movie" | "tv">(
        (searchParams.get("type") as "movie" | "tv") || "movie"
    );
    const [selectedGenre, setSelectedGenre] = useState(searchParams.get("genre_id") || "");
    const [selectedNetwork, setSelectedNetwork] = useState(searchParams.get("network_id") || "");
    const [selectedYear, setSelectedYear] = useState(searchParams.get("year") || "");
    const [selectedLanguage, setSelectedLanguage] = useState(searchParams.get("language") || "");
    const [selectedCountry, setSelectedCountry] = useState(searchParams.get("country") || "US");
    const [selectedSort, setSelectedSort] = useState(searchParams.get("sort_by") || "popularity.desc");
    const [selectedLetter, setSelectedLetter] = useState(searchParams.get("letter") || "");

    const [items, setItems] = useState<MovieItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(true);

    const observerTarget = useRef<HTMLDivElement>(null);

    // Fetch catalog helper
    const fetchCatalog = useCallback(async (pageNum: number, isAppend: boolean) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                media_type: mediaType,
                sort_by: selectedSort,
                page: String(pageNum),
                watch_region: selectedCountry
            });

            if (selectedGenre) params.set("genre_id", selectedGenre);
            if (selectedNetwork && mediaType === "tv") params.set("network_id", selectedNetwork);
            if (selectedYear) params.set("year", selectedYear);

            const res = await axios.get(`/api/prime/discover?${params.toString()}`);
            let fetchedResults = res.data.results || [];

            // Apply client-side alphabet filter if selected
            if (selectedLetter) {
                const letter = selectedLetter.toLowerCase();
                fetchedResults = fetchedResults.filter((item: MovieItem) => {
                    const title = (item.title || item.name || "").toLowerCase();
                    return title.startsWith(letter);
                });
            }

            if (isAppend) {
                setItems(prev => {
                    const combined = [...prev, ...fetchedResults];
                    // Deduplicate by ID
                    const seen = new Set();
                    return combined.filter(item => {
                        if (seen.has(item.id)) return false;
                        seen.add(item.id);
                        return true;
                    });
                });
            } else {
                setItems(fetchedResults);
            }
            
            setTotalPages(res.data.total_pages || 1);
        } catch (err: any) {
            console.error("Browse loading failed:", err);
            setError("Failed to load catalog content. Please try again.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [mediaType, selectedGenre, selectedNetwork, selectedYear, selectedLanguage, selectedCountry, selectedSort, selectedLetter]);

    // Fetch initial on change
    useEffect(() => {
        setPage(1);
        fetchCatalog(1, false);
    }, [mediaType, selectedGenre, selectedNetwork, selectedYear, selectedLanguage, selectedCountry, selectedSort, selectedLetter, fetchCatalog]);

    // Handle Infinite Scroll
    useEffect(() => {
        if (loading || loadingMore || page >= totalPages) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchCatalog(nextPage, true);
                }
            },
            { threshold: 0.1 }
        );

        const target = observerTarget.current;
        if (target) observer.observe(target);

        return () => {
            if (target) observer.unobserve(target);
        };
    }, [page, totalPages, loading, loadingMore, fetchCatalog]);

    const handleReset = () => {
        setSelectedGenre("");
        setSelectedNetwork("");
        setSelectedYear("");
        setSelectedLanguage("");
        setSelectedCountry("US");
        setSelectedSort("popularity.desc");
        setSelectedLetter("");
        setPage(1);
    };

    return (
        <main className="min-h-screen pt-24 pb-20 px-4 md:px-8 bg-[#050505]">
            <div className="max-w-[1800px] mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black text-white flex items-center gap-3">
                            <Compass className="w-8 h-8 text-[#FF9D00] shrink-0 animate-pulse" />
                            Browse <span className="bg-gradient-to-r from-[#FF9D00] to-[#FFB333] bg-clip-text text-transparent">Catalog</span>
                        </h1>
                        <p className="text-zinc-400 mt-2 font-medium text-sm">
                            Explore dynamic catalog collections with infinite scrolling and premium filtering.
                        </p>
                    </div>

                    {/* Media Type Switcher & Filters Toggle */}
                    <div className="flex items-center gap-3">
                        <div className="bg-[#12131A] border border-white/5 p-1 rounded-xl flex gap-1">
                            <button
                                onClick={() => { setMediaType("movie"); setSelectedNetwork(""); }}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    mediaType === "movie" 
                                        ? "bg-gradient-to-r from-[#FF9D00] to-[#FFB333] text-black shadow-lg" 
                                        : "text-zinc-400 hover:text-white"
                                }`}
                            >
                                <Film className="w-3.5 h-3.5" />
                                Movies
                            </button>
                            <button
                                onClick={() => setMediaType("tv")}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    mediaType === "tv" 
                                        ? "bg-gradient-to-r from-[#FF9D00] to-[#FFB333] text-black shadow-lg" 
                                        : "text-zinc-400 hover:text-white"
                                }`}
                            >
                                <Tv className="w-3.5 h-3.5" />
                                Shows
                            </button>
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 h-11 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                showFilters 
                                    ? "bg-[#FF9D00]/10 border-[#FF9D00]/30 text-[#FF9D00] shadow-[0_0_15px_rgba(255,157,0,0.1)]" 
                                    : "bg-[#12131A] border-white/5 text-zinc-400 hover:text-white"
                            }`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            Filters
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-[#12131A]/60 border border-white/5 rounded-2xl p-6 space-y-6 backdrop-blur-md">
                                
                                {/* Filters Form */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {/* Sort By */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                                            <ArrowUpDown className="w-3 h-3 text-[#FF9D00]" /> Sort By
                                        </label>
                                        <select
                                            value={selectedSort}
                                            onChange={(e) => setSelectedSort(e.target.value)}
                                            className="w-full bg-[#08080B] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#FF9D00]/50 transition-colors font-bold"
                                        >
                                            {SORT_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Year */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3 text-[#FF9D00]" /> Year
                                        </label>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                            className="w-full bg-[#08080B] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#FF9D00]/50 transition-colors font-bold"
                                        >
                                            <option value="">All Years</option>
                                            {Array.from({ length: 37 }, (_, i) => String(2026 - i)).map(yr => (
                                                <option key={yr} value={yr}>{yr}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Language */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                                            <Globe className="w-3 h-3 text-[#FF9D00]" /> Language
                                        </label>
                                        <select
                                            value={selectedLanguage}
                                            onChange={(e) => setSelectedLanguage(e.target.value)}
                                            className="w-full bg-[#08080B] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#FF9D00]/50 transition-colors font-bold"
                                        >
                                            <option value="">All Languages</option>
                                            {LANGUAGES.map(lang => (
                                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Country */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                                            <Globe className="w-3 h-3 text-[#FF9D00]" /> Region
                                        </label>
                                        <select
                                            value={selectedCountry}
                                            onChange={(e) => setSelectedCountry(e.target.value)}
                                            className="w-full bg-[#08080B] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#FF9D00]/50 transition-colors font-bold"
                                        >
                                            {COUNTRIES.map(c => (
                                                <option key={c.code} value={c.code}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Reset button */}
                                    <div className="flex items-end">
                                        <button
                                            onClick={handleReset}
                                            className="w-full h-10 border border-white/5 bg-[#08080B] hover:bg-white/5 text-zinc-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Reset Filters
                                        </button>
                                    </div>
                                </div>

                                {/* Network Selection (shows only for TV Shows) */}
                                {mediaType === "tv" && (
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Select Network Channel</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {NETWORKS.map(net => (
                                                <button
                                                    key={net.id}
                                                    onClick={() => setSelectedNetwork(selectedNetwork === net.id ? "" : net.id)}
                                                    className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                                        selectedNetwork === net.id
                                                            ? "bg-[#FF9D00] text-black border-transparent shadow-[0_0_15px_rgba(255,157,0,0.25)]"
                                                            : "bg-[#08080B] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                                                    }`}
                                                >
                                                    <span>{net.logo}</span>
                                                    {net.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Genres Filter */}
                                <div className="space-y-3 pt-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Filter by Genre</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {GENRES.map(g => (
                                            <button
                                                key={g.id}
                                                onClick={() => setSelectedGenre(selectedGenre === g.id ? "" : g.id)}
                                                className={`px-3.5 py-2 border rounded-full text-[11px] font-extrabold transition-all cursor-pointer ${
                                                    selectedGenre === g.id
                                                        ? "bg-gradient-to-r from-[#FF9D00] to-[#FFB333] text-black border-transparent shadow-[0_0_15px_rgba(255,157,0,0.25)]"
                                                        : "bg-[#08080B] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                                                }`}
                                            >
                                                {g.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Alphabet Selector */}
                                <div className="space-y-3 pt-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Titles Starting With</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {ALPHABET.map(letter => (
                                            <button
                                                key={letter}
                                                onClick={() => setSelectedLetter(selectedLetter === letter ? "" : letter)}
                                                className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center cursor-pointer ${
                                                    selectedLetter === letter
                                                        ? "bg-[#FF9D00] text-black shadow-[0_0_10px_#FF9D00/25]"
                                                        : "bg-[#08080B] text-zinc-400 hover:text-white hover:bg-white/5"
                                                }`}
                                            >
                                                {letter}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Results Count */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <p className="text-sm text-zinc-400 font-semibold">
                        Found <span className="text-white font-extrabold">{items.length}</span> titles matching filters
                    </p>
                </div>

                {/* Items Grid */}
                {loading ? (
                    <GridSkeleton count={16} />
                ) : error ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20 text-red-500">
                            <X className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
                        <p className="text-zinc-500 text-sm mb-6">{error}</p>
                        <button
                            onClick={() => fetchCatalog(1, false)}
                            className="px-6 py-2.5 bg-gradient-to-r from-[#FF9D00] to-[#FFB333] text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all"
                        >
                            Retry Loading
                        </button>
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center opacity-60">
                        <Compass className="w-16 h-16 text-zinc-500 mb-4" />
                        <h3 className="text-lg font-bold text-white">No content matching filters</h3>
                        <p className="text-zinc-500 text-sm mt-1">Try resetting genres, networks, or alphabetical parameters.</p>
                        <button
                            onClick={handleReset}
                            className="mt-6 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-white border border-white/10 transition-all"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="grid grid-cols-1 min-[370px]:grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-6">
                            {items.map((item, idx) => (
                                <motion.div
                                    key={`${item.id}-${idx}`}
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.3) }}
                                >
                                    <MovieCard item={item} type={item.media_type || mediaType} />
                                </motion.div>
                            ))}
                        </div>

                        {/* Infinite scroll target trigger */}
                        <div ref={observerTarget} className="h-10 w-full flex items-center justify-center mt-12">
                            {loadingMore && (
                                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                                    <Loader2 className="w-4 h-4 animate-spin text-[#FF9D00]" />
                                    Loading More Hits...
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
